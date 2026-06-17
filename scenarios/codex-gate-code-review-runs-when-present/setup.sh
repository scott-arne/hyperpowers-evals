#!/usr/bin/env bash
set -euo pipefail
# Base repo, a feature branch with one committed change to review against main,
# then seed a stub codex-plugin-cc into the agent's throwaway home so the Codex
# review gate takes its "available" path deterministically (no real Codex/auth).
setup-helpers run create_base_repo
git checkout -b feature/small-change
printf '%s\n' "export function greet(name) { return 'hi ' + name; }" > greet.js
git add greet.js
git -c user.name='Drill Test' -c user.email='drill@example.com' commit -q -m "Add greet helper"
setup-helpers run seed_codex_plugin_cc
