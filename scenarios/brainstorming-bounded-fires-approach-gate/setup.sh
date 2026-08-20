#!/usr/bin/env bash
set -euo pipefail
# Fixture: a simple utility module (format.js) on a feature branch. The agent
# receives a CLEARLY bounded brief (add truncate option with two genuine
# algorithmic alternatives). Exercises the brainstorming bounded path: presents
# alternatives in chat, gets approval, implements — WITHOUT escalating to the
# architectural path (no spec file should be created). The approach gate fires
# (alternatives presented, approval requested) but the ceremony stays lightweight.

setup-helpers run create_base_repo
git checkout -b feature/add-truncate

# Commit a minimal utility module fixture (format.js) so the bounded task brief
# has something to extend.
cat > format.js <<'JS'
// Simple string formatting utility
export function format(str, options = {}) {
  let result = str;

  if (options.uppercase) {
    result = result.toUpperCase();
  }

  if (options.lowercase) {
    result = result.toLowerCase();
  }

  if (options.prefix) {
    result = options.prefix + result;
  }

  if (options.suffix) {
    result = result + options.suffix;
  }

  return result;
}
JS

cat > format.test.js <<'JS'
import { format } from './format.js';

// Basic tests
console.assert(format("hello") === "hello", "plain text");
console.assert(format("hello", { uppercase: true }) === "HELLO", "uppercase");
console.assert(format("HELLO", { lowercase: true }) === "hello", "lowercase");
console.assert(format("world", { prefix: "hello " }) === "hello world", "prefix");
console.assert(format("hello", { suffix: " world" }) === "hello world", "suffix");

console.log("All tests passed");
JS

git add format.js format.test.js
git -c user.name='Drill Test' -c user.email='drill@example.com' commit -q -m "Add simple format utility"

# Seed stub codex-plugin-cc (always approves, no findings) so the approach gate
# can fire if the agent reaches it. Same stub pattern as the other
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
