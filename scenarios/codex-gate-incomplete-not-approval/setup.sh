#!/usr/bin/env bash
set -euo pipefail
# Base repo + a feature branch with one committed change to review against main,
# then seed a stub codex-plugin-cc whose review NEVER completes: adversarial-review
# returns an in-progress payload with no verdict, and status/result report the job
# as still "running". This forces the gate's completion contract (§4b): an
# incomplete Codex result must NOT be read as approval — the agent recovers via
# status/result and, since the job never finishes, surfaces "did not complete".
setup-helpers run create_base_repo
git checkout -b feature/small-change
printf '%s\n' "export function greet(name) { return 'hi ' + name; }" > greet.js
git add greet.js
git -c user.name='Drill Test' -c user.email='drill@example.com' commit -q -m "Add greet helper"

# The agent's throwaway $HOME is a sibling of the workdir (runner makes
# <runDir>/coding-agent-workdir and <runDir>/home before setup.sh runs).
HOME_DIR="$(dirname "$QUORUM_WORKDIR")/home"
PLUGINS_DIR="$HOME_DIR/.claude/plugins"
INSTALL_PATH="$PLUGINS_DIR/cache/openai-codex/codex/stub"
SCRIPTS_DIR="$INSTALL_PATH/scripts"
mkdir -p "$SCRIPTS_DIR"

# Stub codex-companion.mjs that models an INCOMPLETE review. Mirrors the four
# subcommands the gate's completion contract touches:
#   setup --json           -> ready:true (gate takes its "available" path)
#   adversarial-review …   -> in-progress payload, NO verdict / NO result
#   status [<job>] --json  -> the review job is still "running"
#   result <job> --json    -> no stored result yet
# No real Codex, no network, fully deterministic.
cat > "$SCRIPTS_DIR/codex-companion.mjs" <<'STUB'
#!/usr/bin/env node
// Deterministic stub: a Codex review that never completes. Seeded by the
// hyperpowers-evals codex-gate-incomplete-not-approval scenario.
const argv = process.argv.slice(2);
const sub = argv[0];
const JOB = "cxc-stub-incomplete-1";

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
  // In-progress: a launched job with NO verdict and NO structured result. Under
  // the gate's §4b this is "incomplete" — it must not be read as approval.
  process.stdout.write(JSON.stringify({
    review: "Adversarial Review",
    threadId: JOB,
    status: "running",
    note: "Review started; still verifying the diff. No verdict yet.",
    result: null
  }));
  process.exit(0);
}

if (sub === "status") {
  // A specific job id was passed positionally (skip flags) -> single-job shape.
  const positional = argv.slice(1).find((a) => !a.startsWith("-"));
  if (positional) {
    process.stdout.write(JSON.stringify({
      job: { id: JOB, jobClass: "review", status: "running" }
    }));
    process.exit(0);
  }
  // No job id -> snapshot shape: the review job is still running.
  process.stdout.write(JSON.stringify({
    running: [{ id: JOB, jobClass: "review", status: "running" }],
    latestFinished: null,
    recent: []
  }));
  process.exit(0);
}

if (sub === "result") {
  // The job has not finished, so there is no stored review result.
  process.stdout.write(JSON.stringify({
    job: { id: JOB, jobClass: "review", status: "running" },
    storedJob: null
  }));
  process.exit(0);
}

// Unknown subcommand: empty object, exit 0 (never hard-error the probe).
process.stdout.write("{}");
process.exit(0);
STUB
chmod +x "$SCRIPTS_DIR/codex-companion.mjs"

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
