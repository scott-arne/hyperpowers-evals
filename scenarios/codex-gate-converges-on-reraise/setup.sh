#!/usr/bin/env bash
set -euo pipefail
# Base repo + a feature branch with one committed change to review against main,
# then seed a stub codex-plugin-cc whose review CONVERGES across rounds: the
# first adversarial-review returns one blocking (high) finding; every later
# review returns approve/no-findings. This exercises the gate's convergence
# stop-rule (§5): after the round-1 finding is addressed, the round-2 clean
# review is a fixed point and the loop STOPS — it does not thrash to the backstop.
setup-helpers run create_base_repo
git checkout -b feature/small-change
printf '%s\n' "export function greet(name) { return 'hi ' + name; }" > greet.js
git add greet.js
git -c user.name='Drill Test' -c user.email='drill@example.com' commit -q -m "Add greet helper"

HOME_DIR="$(dirname "$QUORUM_WORKDIR")/home"
PLUGINS_DIR="$HOME_DIR/.claude/plugins"
INSTALL_PATH="$PLUGINS_DIR/cache/openai-codex/codex/stub"
SCRIPTS_DIR="$INSTALL_PATH/scripts"
mkdir -p "$SCRIPTS_DIR"

# A call-counter lives next to the stub. Each adversarial-review invocation
# increments it; round 1 returns a blocking finding, rounds 2+ return approve.
# Every review also writes a job record next to the stub, so the gate's
# detached-launch pattern (launch in background -> status --json for the job id
# -> status <id> [--wait] -> result <id> --json) retrieves the stored verdict at
# .storedJob.result.result exactly like the real companion. The paths are
# derived from the stub's own location so they are stable across the agent's
# invocations regardless of cwd.
cat > "$SCRIPTS_DIR/codex-companion.mjs" <<'STUB'
#!/usr/bin/env node
// Deterministic stub: a Codex review that converges, with a real job lifecycle
// so the gate's detached-launch + status/result watch pattern works. Round 1
// records one blocking finding; every later round approves. Seeded by the
// hyperpowers-evals codex-gate-converges-on-reraise scenario. Real Codex is
// never invoked.
// The .mjs extension forces ES-module scope, so use import + import.meta, not
// require/__dirname (which are undefined here).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const argv = process.argv.slice(2);
const sub = argv[0];
const HERE = path.dirname(fileURLToPath(import.meta.url));
const COUNTER = path.join(HERE, ".review-count");
const JOBS = path.join(HERE, ".jobs");
const readCount = () => {
  try { return parseInt(fs.readFileSync(COUNTER, "utf8").trim(), 10) || 0; }
  catch { return 0; }
};
const jobId = (n) => `cxc-stub-review-${n}`;
const jobFile = (id) => path.join(JOBS, `${id}.json`);
const readJob = (id) => {
  try { return JSON.parse(fs.readFileSync(jobFile(id), "utf8")); }
  catch { return null; }
};
const newestJob = () => {
  const n = readCount();
  return n > 0 ? readJob(jobId(n)) : null;
};

if (sub === "setup") {
  process.stdout.write(JSON.stringify({
    ready: true,
    node: { available: true, detail: "stub" },
    codex: { available: true, detail: "stub codex-companion" },
    auth: { available: true, loggedIn: true, detail: "stub auth" },
    reviewGateEnabled: false
  }));
  process.exit(0);
}

if (sub === "review" || sub === "adversarial-review") {
  const n = readCount() + 1;
  try { fs.writeFileSync(COUNTER, String(n)); } catch {}

  const payload = n === 1
    ? {
        // Round 1: one blocking (high) finding to address.
        verdict: "needs-attention",
        summary: "Round 1: one blocking finding.",
        findings: [{
          severity: "high",
          title: "Missing input validation on greet",
          body: "greet() does not validate its input before use.",
          file: "greet.js",
          line_start: 1,
          line_end: 1,
          confidence: 0.9,
          recommendation: "Validate and reject a non-string name."
        }],
        next_steps: ["Address the blocking finding, then re-review."]
      }
    : {
        // Rounds 2+: converged — approve, no findings.
        verdict: "approve",
        summary: "Re-review: the prior blocking finding is resolved; no new blocking findings.",
        findings: [],
        next_steps: []
      };

  // Persist the job record the way the real companion does, so status/result
  // serve the verdict after a detached launch. The stub review is instant, so
  // the job lands directly in the terminal "completed" state.
  const job = { id: jobId(n), jobClass: "review", status: "completed" };
  try {
    fs.mkdirSync(JOBS, { recursive: true });
    fs.writeFileSync(jobFile(job.id), JSON.stringify({
      job,
      storedJob: { result: { result: payload, rawOutput: JSON.stringify(payload) } }
    }));
  } catch {}

  // stdout still carries the payload — the launch output is the documented
  // fallback channel.
  process.stdout.write(JSON.stringify(payload));
  process.exit(0);
}

if (sub === "status") {
  const positional = argv.slice(1).find((a) => !a.startsWith("-"));
  if (positional) {
    const rec = readJob(positional);
    process.stdout.write(JSON.stringify({
      job: rec ? rec.job : { id: positional, jobClass: "review", status: "unknown" }
    }));
    process.exit(0);
  }
  // Snapshot: the stub review completes instantly, so nothing is ever
  // "running" — the newest job shows up in latestFinished/recent.
  const j = newestJob();
  process.stdout.write(JSON.stringify({
    running: [],
    latestFinished: j ? j.job : null,
    recent: j ? [j.job] : []
  }));
  process.exit(0);
}

if (sub === "result") {
  const positional = argv.slice(1).find((a) => !a.startsWith("-"));
  const rec = positional ? readJob(positional) : newestJob();
  if (rec && rec.job.status === "completed") {
    process.stdout.write(JSON.stringify(rec));
  } else {
    process.stdout.write(JSON.stringify({
      job: rec ? rec.job : null,
      storedJob: null
    }));
  }
  process.exit(0);
}

// Unknown subcommand: empty object, exit 0.
process.stdout.write("{}");
process.exit(0);
STUB
chmod +x "$SCRIPTS_DIR/codex-companion.mjs"

# The gate's availability probe reads the companion version from the plugin
# manifest (line 2 of probe stdout); seed one so the version path is exercised.
mkdir -p "$INSTALL_PATH/.claude-plugin"
cat > "$INSTALL_PATH/.claude-plugin/plugin.json" <<'MANIFEST'
{ "name": "codex", "version": "0.0.0-stub" }
MANIFEST

cat > "$PLUGINS_DIR/installed_plugins.json" <<JSON
{
  "version": 2,
  "plugins": {
    "codex@openai-codex": [
      {
        "scope": "user",
        "installPath": "$INSTALL_PATH",
        "version": "stub",
        "installedAt": "2026-01-01T00:00:00.000Z",
        "lastUpdated": "2026-01-01T00:00:00.000Z"
      }
    ]
  }
}
JSON
