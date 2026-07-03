#!/usr/bin/env bash
set -euo pipefail
# Base repo + an approved spec to plan from, then seed a stub codex-plugin-cc
# whose document review (`task`) CONVERGES across rounds: the first task review
# returns one blocking (high) finding; every later task review approves. This
# exercises the plan gate's foreground-await contract (§3/§4b): a document
# review runs as a synchronous foreground `task` that blocks and returns its
# verdict inline — no `--background`, no `sleep`-then-poll. The stub is
# deterministic; real Codex is never invoked and there is no network.
setup-helpers run create_base_repo

mkdir -p docs/hyperpowers/specs
cat > docs/hyperpowers/specs/healthz-design.md <<'SPEC'
# /healthz Endpoint — Design

**Status:** Approved

## Goal
Add a `/healthz` endpoint that returns HTTP 200 with the plain-text body `ok`.

## Requirements
- Route: `GET /healthz`.
- Response: status 200, `Content-Type: text/plain`, body exactly `ok`.
- No authentication.
- One unit test asserting status and body.
SPEC
git add docs/hyperpowers/specs/healthz-design.md
git -c user.name='Drill Test' -c user.email='drill@example.com' commit -q -m "Add approved healthz spec"

# The agent's throwaway $HOME is a sibling of the workdir (runner makes
# <runDir>/coding-agent-workdir and <runDir>/home before setup.sh runs).
HOME_DIR="$(dirname "$QUORUM_WORKDIR")/home"
PLUGINS_DIR="$HOME_DIR/.claude/plugins"
INSTALL_PATH="$PLUGINS_DIR/cache/openai-codex/codex/stub"
SCRIPTS_DIR="$INSTALL_PATH/scripts"
mkdir -p "$SCRIPTS_DIR"

# Stub codex-companion.mjs modeling a CONVERGING document review. A call-counter
# lives next to the stub; each `task` invocation increments it. Round 1 returns
# a blocking finding, rounds 2+ approve. `task` writes its verdict to stdout and
# exits 0 synchronously — the foreground contract. If `--background` is ever
# passed to `task`, the stub still emits a marker payload so the mis-invocation
# is unmistakable in the transcript (the checks assert it never happens).
# The .mjs extension forces ES-module scope: use import + import.meta, not
# require/__dirname (undefined here).
cat > "$SCRIPTS_DIR/codex-companion.mjs" <<'STUB'
#!/usr/bin/env node
// Deterministic stub: a Codex DOCUMENT review (`task`) that converges. Round 1
// flags one blocking finding; every later round approves. Seeded by the
// hyperpowers-evals codex-doc-gate-foreground-await scenario. Real Codex is
// never invoked.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const argv = process.argv.slice(2);
const sub = argv[0];
const HERE = path.dirname(fileURLToPath(import.meta.url));
const COUNTER = path.join(HERE, ".task-count");
const backgrounded = argv.includes("--background");

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

if (sub === "task") {
  let n = 0;
  try { n = parseInt(fs.readFileSync(COUNTER, "utf8").trim(), 10) || 0; } catch {}
  n += 1;
  try { fs.writeFileSync(COUNTER, String(n)); } catch {}

  // A document review must run foreground. If the agent backgrounds it, still
  // return a payload (so the run does not wedge), but tag it so the transcript
  // shows the contract was violated. The deterministic checks assert the
  // agent never combined `task` with `--background` in the first place.
  const bg = backgrounded ? { backgrounded: true } : {};

  if (n === 1) {
    process.stdout.write(JSON.stringify({
      ...bg,
      verdict: "needs-attention",
      summary: "Round 1: one blocking finding on the plan.",
      findings: [{
        severity: "high",
        title: "Task ordering: test precedes route definition",
        body: "The plan writes the healthz test before the route exists, so the first task cannot pass its own verification.",
        recommendation: "Reorder so the route task lands before, or with, its test."
      }],
      next_steps: ["Address the blocking finding, then re-review."]
    }));
    process.exit(0);
  }

  // Rounds 2+: converged — approve, no findings.
  process.stdout.write(JSON.stringify({
    ...bg,
    verdict: "approve",
    summary: "Re-review: the prior blocking finding is resolved; no new blocking findings.",
    findings: [],
    next_steps: []
  }));
  process.exit(0);
}

// Unknown subcommand (including status/result — a foreground task never needs
// them here): empty object, exit 0. Never hard-error the probe.
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
