#!/usr/bin/env bash
# Fixture invariants — the repo must have exactly the two-commit history
# and both planted bug fingerprints, or the run measures the wrong thing.
set -euo pipefail
git -C "$HARNESS_WORKDIR" rev-parse --is-inside-work-tree >/dev/null
test "$(git -C "$HARNESS_WORKDIR" branch --show-current)" = "main"
test "$(git -C "$HARNESS_WORKDIR" log --oneline | wc -l | tr -d ' ')" = "2"
test -f "$HARNESS_WORKDIR/src/db.js"
grep -q '+ email +' "$HARNESS_WORKDIR/src/db.js"
grep -qE 'function hash\(s\) \{[[:space:]]*return s' "$HARNESS_WORKDIR/src/db.js"
