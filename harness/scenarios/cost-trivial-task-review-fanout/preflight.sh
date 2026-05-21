#!/usr/bin/env bash
# Fixture invariants — src/app.js and a one-task plan must exist for the
# agent to execute.
set -euo pipefail
git -C "$HARNESS_WORKDIR" rev-parse --is-inside-work-tree >/dev/null
test "$(git -C "$HARNESS_WORKDIR" branch --show-current)" = "main"
test -f "$HARNESS_WORKDIR/src/app.js"
ls "$HARNESS_WORKDIR"/docs/superpowers/plans/*.md >/dev/null 2>&1
