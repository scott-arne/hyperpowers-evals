#!/usr/bin/env bash
set -euo pipefail
# Fixture: a base repo + stub codex-companion that returns two canned approaches
# in the required output shape. Every `task` call copies the received prompt file
# to codex-stub-calls/call-<N>.md (deterministic artifact), then returns the
# canned approaches. The fixture idea text contains FIXTURE-IDEA-7Q4 so checks can
# prove the blind handoff carried verbatim inputs.
setup-helpers run create_base_repo

HOME_DIR="$(dirname "$QUORUM_WORKDIR")/home"
PLUGINS_DIR="$HOME_DIR/.claude/plugins"
INSTALL_PATH="$PLUGINS_DIR/cache/openai-codex/codex/stub"
SCRIPTS_DIR="$INSTALL_PATH/scripts"
mkdir -p "$SCRIPTS_DIR"

# The stub's artifact contract: every task call writes the received --prompt-file
# to $QUORUM_WORKDIR/codex-stub-calls/call-<N>.md before responding, so checks can
# assert the handoff carried the fixture marker FIXTURE-IDEA-7Q4.
cat > "$SCRIPTS_DIR/codex-companion.mjs" <<'STUB'
#!/usr/bin/env node
// Deterministic stub: returns two canned approaches in the required output shape.
// Copies every received --prompt-file to codex-stub-calls/call-<N>.md (artifact
// contract for deterministic checks). Seeded by hyperpowers-evals
// codex-approach-gate-fires-on-architecture scenario. Real Codex never invoked.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const argv = process.argv.slice(2);
const sub = argv[0];
const HERE = path.dirname(fileURLToPath(import.meta.url));
const COUNTER = path.join(HERE, ".task-count");
const readCount = () => {
  try { return parseInt(fs.readFileSync(COUNTER, "utf8").trim(), 10) || 0; }
  catch { return 0; }
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

if (sub === "task") {
  // Resolve the artifact dir baked at setup time (stub-config.json). The
  // caller's CWD and env are NOT reliable: the Coding-Agent's shell may sit
  // anywhere and QUORUM_WORKDIR is not exported to it.
  let stubCallsDir = path.join(process.env.QUORUM_WORKDIR || ".", "codex-stub-calls");
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(HERE, "stub-config.json"), "utf8"));
    if (cfg && typeof cfg.stubCallsDir === "string" && cfg.stubCallsDir) stubCallsDir = cfg.stubCallsDir;
  } catch {}

  // A task call without a readable --prompt-file fails loudly, like the real
  // companion would, so the caller retries with a real file instead of the
  // call record being silently lost. Failed calls do not consume a round.
  const promptIdx = argv.indexOf("--prompt-file");
  const promptPath = promptIdx >= 0 ? argv[promptIdx + 1] : undefined;
  if (!promptPath) {
    process.stderr.write("codex-companion stub: --prompt-file <path> is required\n");
    process.exit(1);
  }
  let promptContent;
  try {
    promptContent = fs.readFileSync(promptPath, "utf8");
  } catch (e) {
    process.stderr.write(`codex-companion stub: cannot read --prompt-file ${promptPath}: ${e.message}\n`);
    process.exit(1);
  }

  const n = readCount() + 1;
  fs.writeFileSync(COUNTER, String(n));
  fs.mkdirSync(stubCallsDir, { recursive: true });
  fs.writeFileSync(path.join(stubCallsDir, `call-${n}.md`), promptContent);

  // Return two canned approaches in the required output shape.
  const response = `Approaches (2-3, each genuinely different):
- name: SQLite-backed queue with separate coordinator process
  how-it-works: Tasks stored in a SQLite database, polled by worker threads. A separate coordinator process handles retries and dead-letter routing.
  tradeoffs: Simple deployment (one DB file), but coordination logic is split and polling adds latency.
  when-it-wins: Small-to-medium scale, single-node deployments where simplicity trumps latency.
  rough-complexity: moderate

- name: In-memory queue with persistent log
  how-it-works: Task queue held in process memory (collections.deque), with every enqueue/dequeue appended to a persistent log (JSON lines or MessagePack). On restart, replay the log to rebuild the in-memory queue.
  tradeoffs: Fast task access, but log replay can be slow for large queues and workers must drain before shutdown.
  when-it-wins: Low-latency, moderate-volume scenarios where restart frequency is low.
  rough-complexity: moderate
`;

  process.stdout.write(response);
  process.exit(0);
}

// Unknown subcommand: empty object, exit 0.
process.stdout.write("{}");
process.exit(0);
STUB
chmod +x "$SCRIPTS_DIR/codex-companion.mjs"

# Bake the artifact dir so the stub never depends on the caller's CWD or env
# (QUORUM_WORKDIR is not exported to the Coding-Agent's shell).
cat > "$SCRIPTS_DIR/stub-config.json" <<CFG
{ "stubCallsDir": "$QUORUM_WORKDIR/codex-stub-calls" }
CFG

# Seed plugin manifest so version probe works.
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
