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
# The counter path is derived from the stub's own location so it is stable
# across the agent's invocations regardless of cwd.
cat > "$SCRIPTS_DIR/codex-companion.mjs" <<'STUB'
#!/usr/bin/env node
// Deterministic stub: a Codex review that converges. Round 1 flags one blocking
// finding; every later round approves. Seeded by the hyperpowers-evals
// codex-gate-converges-on-reraise scenario. Real Codex is never invoked.
// The .mjs extension forces ES-module scope, so use import + import.meta, not
// require/__dirname (which are undefined here).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const argv = process.argv.slice(2);
const sub = argv[0];
const HERE = path.dirname(fileURLToPath(import.meta.url));
const COUNTER = path.join(HERE, ".review-count");

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
  let n = 0;
  try { n = parseInt(fs.readFileSync(COUNTER, "utf8").trim(), 10) || 0; } catch {}
  n += 1;
  try { fs.writeFileSync(COUNTER, String(n)); } catch {}

  if (n === 1) {
    // Round 1: one blocking (high) finding to address.
    process.stdout.write(JSON.stringify({
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
    }));
    process.exit(0);
  }

  // Rounds 2+: converged — approve, no findings.
  process.stdout.write(JSON.stringify({
    verdict: "approve",
    summary: "Re-review: the prior blocking finding is resolved; no new blocking findings.",
    findings: [],
    next_steps: []
  }));
  process.exit(0);
}

// Unknown subcommand: empty object, exit 0.
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
