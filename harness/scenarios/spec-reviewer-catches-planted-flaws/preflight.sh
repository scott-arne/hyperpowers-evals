#!/usr/bin/env bash
# Fixture invariants — the flawed spec must exist and still carry the
# planted TODO and "specified later" markers the reviewer must catch.
set -euo pipefail
SPEC="$HARNESS_WORKDIR/docs/superpowers/specs/test-feature-design.md"
git -C "$HARNESS_WORKDIR" rev-parse --is-inside-work-tree >/dev/null
test "$(git -C "$HARNESS_WORKDIR" branch --show-current)" = "main"
test -f "$SPEC"
grep -q 'TODO: Add more requirements here' "$SPEC"
grep -q 'specified later' "$SPEC"
