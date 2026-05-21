#!/usr/bin/env bash
# Fixture invariants — a clean repo with no superpowers docs yet, so the
# spec and plan the agent produces are entirely its own output.
set -euo pipefail
git -C "$HARNESS_WORKDIR" rev-parse --is-inside-work-tree >/dev/null
test "$(git -C "$HARNESS_WORKDIR" branch --show-current)" = "main"
test -f "$HARNESS_WORKDIR/README.md"
if [ -d "$HARNESS_WORKDIR/docs/superpowers" ]; then
    echo "preflight FAIL: docs/superpowers already exists" >&2
    exit 1
fi
