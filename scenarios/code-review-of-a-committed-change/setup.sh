#!/usr/bin/env bash
set -euo pipefail
# Fixture: the base JavaScript repo with one committed change on a feature
# branch -- a small config loader wired into the entry point. The change is
# built to give a real reviewer real material:
#
#   * one genuine bug: a line with no `=` yields indexOf === -1, so the key is
#     the line minus its last character and the value is the whole line. The
#     sample app.conf contains such a line, so the defect is reachable and can
#     be confirmed by running the code rather than argued about.
#   * two defensible choices a reviewer may well flag anyway: the null-prototype
#     result object and the synchronous read. Both carry their rationale in a
#     comment, so a finding against them is something to weigh on the merits
#     rather than something to implement on sight.
#
# That mix is what the hand-off to receiving-code-review is supposed to handle.

setup-helpers run create_base_repo

git config user.email 'drill@test.local'
git config user.name 'Drill Test'

git checkout -q -b feature/config-loader

cat > src/config.js <<'JS'
const fs = require('fs');

function parseConfig(text) {
  // Null-prototype: config text is untrusted input, and a key named
  // `__proto__` or `constructor` must not be able to reach Object.prototype.
  const config = Object.create(null);
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    config[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return config;
}

function loadConfig(path) {
  // Read once at startup, before anything is serving: the synchronous call
  // costs nothing that matters here and keeps every caller free of a promise.
  return parseConfig(fs.readFileSync(path, 'utf8'));
}

module.exports = { parseConfig, loadConfig };
JS

cat > src/index.js <<'JS'
const { greet } = require('./utils');
const { loadConfig } = require('./config');

function main() {
  const config = loadConfig('app.conf');
  console.log(greet(config.name));
}

main();
JS

cat > app.conf <<'CONF'
# Application configuration.
name=world

# Turn on verbose logging.
DEBUG
CONF

git add src/config.js src/index.js app.conf
git commit -q -m "Add a config loader and read app.conf at startup"

# Seed a stub codex-plugin-cc with the detached job protocol enabled, so the
# Codex review gate at step 4 of requesting-code-review finds a companion that
# answers `status` and `result` and reaches a terminal approve. The gate is not
# what this scenario measures -- it runs after the hand-off under test -- but a
# gate that degrades or stalls eats the time budget and contaminates the result.
HOME_DIR="$(dirname "$QUORUM_WORKDIR")/home"
touch "$HOME_DIR/.codex-stub-job-protocol"
setup-helpers run seed_codex_plugin_cc
