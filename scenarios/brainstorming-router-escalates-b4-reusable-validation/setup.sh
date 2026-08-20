#!/usr/bin/env bash
set -euo pipefail
# Fixture: a small two-file webapp (index.html + app.js) on a feature branch.
# The agent receives one of five adversarially ambiguous briefs that
# pattern-match as bounded but hide architectural concerns (public interface
# change, cross-subsystem restructure, new subsystem, component restructure, or
# hidden complexity). Exercises the brainstorming router's escalation behavior:
# ambiguous briefs that hint at hidden complexity should escalate to the
# architectural path (full spec doc), not inappropriately classify as bounded to
# skip the spec.

setup-helpers run create_base_repo
git checkout -b feature/webapp-enhancement

# Commit a minimal webapp fixture (index.html + app.js) so the task briefs have
# something to modify.
cat > index.html <<'HTML'
<!DOCTYPE html>
<html>
<head>
  <title>Simple Webapp</title>
</head>
<body>
  <h1>Login</h1>
  <form id="login-form">
    <input type="text" id="username" placeholder="Username" />
    <input type="password" id="password" placeholder="Password" />
    <button type="submit">Log In</button>
  </form>
  <script src="app.js"></script>
</body>
</html>
HTML

cat > app.js <<'JS'
// Simple webapp with login form handling
const API_ENDPOINT = "https://api.example.com/login";

function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app
  return { success: true, user: username };
}

function validateForm(formData) {
  if (!formData.username || !formData.password) {
    return { valid: false, error: "Missing required fields" };
  }
  return { valid: true };
}

document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const validation = validateForm({ username, password });
  if (validation.valid) {
    const result = login(username, password);
    console.log("Login result:", result);
  } else {
    console.error("Validation error:", validation.error);
  }
});
JS

git add index.html app.js
git -c user.name='Drill Test' -c user.email='drill@example.com' commit -q -m "Add simple webapp fixture"

# Seed stub codex-plugin-cc (always approves, no findings) so the approach gate
# can fire if the agent reaches it. Same stub pattern as sdd-plan-scoped-scratch.

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
