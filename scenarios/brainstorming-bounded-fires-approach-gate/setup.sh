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

# Seed the stub codex-plugin-cc (fixtures/codex-stubs/approve-companion.mjs) so
# the approach and spec gates can fire if the agent reaches them.
setup-helpers run seed_codex_approve_stub
