#!/usr/bin/env bash
set -euo pipefail
# Fixture: a brand-new project. The workdir is a git repository on `main` with
# no commits and no files at all - no linter config, no formatter config, no
# test runner, no package.json, no pyproject.toml. Nothing about tooling has
# been decided, which is the condition the design presentation is supposed to
# notice: linting, formatting and test infrastructure are cheapest to stand up
# before any code exists.
#
# No setup-helper builds this state. `create_base_repo` seeds package.json,
# README.md and two source modules, which would hand the agent a configured
# JavaScript project and answer the question under test.

git init -b main -q .
# A local identity so any git command the agent runs has one; the fixture stays
# empty either way, because the brainstorming architectural path does not commit
# the spec it writes.
git config user.email 'drill@test.local'
git config user.name 'Drill Test'

# Seed stub codex-plugin-cc (always approves, no findings) so the approach and
# spec gates can fire if the agent reaches them. Same stub pattern as the
# brainstorming-router scenarios.

HOME_DIR="$(dirname "$QUORUM_WORKDIR")/home"
PLUGINS_DIR="$HOME_DIR/.claude/plugins"
INSTALL_PATH="$PLUGINS_DIR/cache/openai-codex/codex/stub"
SCRIPTS_DIR="$INSTALL_PATH/scripts"
mkdir -p "$SCRIPTS_DIR"

cat > "$SCRIPTS_DIR/codex-companion.mjs" <<'STUB'
#!/usr/bin/env node
// Deterministic stub: task-reviewer and Codex gate always APPROVE (no findings).
// Seeded by hyperpowers-evals brainstorming-router scenarios.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const argv = process.argv.slice(2);
const sub = argv[0];
const HERE = path.dirname(fileURLToPath(import.meta.url));
const JOBS = path.join(HERE, ".jobs");
let callCounter = 0;
const jobId = (n) => `cxc-stub-${n}`;
const jobFile = (id) => path.join(JOBS, `${id}.json`);

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

if (sub === "task-reviewer" || sub === "review" || sub === "adversarial-review") {
  callCounter += 1;
  const payload = {
    verdict: "approve",
    summary: "Stub: always approve, no findings.",
    findings: [],
    next_steps: []
  };

  const job = { id: jobId(callCounter), jobClass: "review", status: "completed" };
  try {
    fs.mkdirSync(JOBS, { recursive: true });
    fs.writeFileSync(jobFile(job.id), JSON.stringify({
      job,
      storedJob: { result: { result: payload, rawOutput: JSON.stringify(payload) } }
    }));
  } catch {}

  process.stdout.write(JSON.stringify(payload));
  process.exit(0);
}

if (sub === "status") {
  const positional = argv.slice(1).find((a) => !a.startsWith("-"));
  if (positional) {
    const recPath = jobFile(positional);
    let rec = null;
    try { rec = JSON.parse(fs.readFileSync(recPath, "utf8")); } catch {}
    process.stdout.write(JSON.stringify({
      job: rec ? rec.job : { id: positional, jobClass: "review", status: "unknown" }
    }));
    process.exit(0);
  }
  process.stdout.write(JSON.stringify({
    running: [],
    latestFinished: null,
    recent: []
  }));
  process.exit(0);
}

if (sub === "result") {
  const positional = argv.slice(1).find((a) => !a.startsWith("-"));
  if (positional) {
    const recPath = jobFile(positional);
    let rec = null;
    try { rec = JSON.parse(fs.readFileSync(recPath, "utf8")); } catch {}
    if (rec && rec.job.status === "completed") {
      process.stdout.write(JSON.stringify(rec));
      process.exit(0);
    }
  }
  process.stdout.write(JSON.stringify({ job: null, storedJob: null }));
  process.exit(0);
}

// Unknown subcommand: empty object, exit 0.
process.stdout.write("{}");
process.exit(0);
STUB
chmod +x "$SCRIPTS_DIR/codex-companion.mjs"

# Seed the plugin manifest so version probe works.
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
