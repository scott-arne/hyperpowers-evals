#!/usr/bin/env bash
set -euo pipefail
# Base repo, then a feature branch with one committed change so there is a real
# diff for the agent to review against main.
setup-helpers run create_base_repo
git checkout -b feature/small-change
printf '%s\n' "export function greet(name) { return 'hi ' + name; }" > greet.js
git add greet.js
git -c user.name='Drill Test' -c user.email='drill@example.com' commit -q -m "Add greet helper"
