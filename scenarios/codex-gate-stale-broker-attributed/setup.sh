#!/usr/bin/env bash
set -euo pipefail
# Base repo + a feature branch with one committed change to review against main,
# then seed a stub codex-plugin-cc and a DEAD BROKER for the scenario repo: the
# preflight reports stale-broker (broker.json exists but sessionDir is gone),
# and the gate must degrade attributedly — an explicit notice naming stale-broker
# and quoting the recovery command verbatim, then proceeds without fabricating
# any Codex verdict.
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

# Stub codex-companion.mjs that models a stale broker scenario. This stub
# is never actually invoked (preflight catches the dead broker before setup),
# but its presence is necessary for the preflight to locate the install.
# The body is reused from the sibling scenario.
cat > "$SCRIPTS_DIR/codex-companion.mjs" <<'STUB'
#!/usr/bin/env node
// Deterministic stub: never invoked (preflight catches dead broker before
// setup), but must exist for install discovery. Seeded by the
// hyperpowers-evals codex-gate-stale-broker-attributed scenario.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const argv = process.argv.slice(2);
const sub = argv[0];
const HERE = path.dirname(fileURLToPath(import.meta.url));

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

// Unknown subcommand: empty object, exit 0 (never hard-error the probe).
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

# Seed a dead broker for the scenario repo: a state dir with broker.json
# whose sessionDir does not exist (gone temp dir, mid-session purge).
# Use the scenario repo basename to match broker-state-dir's name fallback.
REPO_BASE="$(basename "$QUORUM_WORKDIR")"
STATE_ROOT="$HOME_DIR/.claude/plugins/data/codex-openai-codex/state"
STATE_DIR="$STATE_ROOT/$REPO_BASE-0123456789abcdef"
mkdir -p "$STATE_DIR"

# The broker.json shape: endpoint, pidFile, logFile, sessionDir, pid.
# sessionDir points to a path that does not exist (dead broker signal).
# pid is a plausible live-ish value that won't match a real broker process.
cat > "$STATE_DIR/broker.json" <<BROKER
{
  "endpoint": "unix:/tmp/gone-session-dir/broker.sock",
  "pidFile": "/tmp/gone-session-dir/broker.pid",
  "logFile": "/tmp/gone-session-dir/broker.log",
  "sessionDir": "/tmp/gone-session-dir",
  "pid": 99999
}
BROKER

# Set the state root override so codex-preflight finds this fixture.
export HYPERPOWERS_CODEX_STATE_ROOT="$STATE_ROOT"
# Prove the broker check fires BEFORE setup (Task 3 contract).
export HYPERPOWERS_CODEX_SETUP_JSON='{"ready":true}'
