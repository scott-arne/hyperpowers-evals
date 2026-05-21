#!/usr/bin/env bash
# Fixture invariants — src/ must hold exactly the five large synthetic
# modules whose full reads are the cost pattern under measurement.
set -euo pipefail
git -C "$HARNESS_WORKDIR" rev-parse --is-inside-work-tree >/dev/null
test "$(git -C "$HARNESS_WORKDIR" branch --show-current)" = "main"
test -d "$HARNESS_WORKDIR/src"
test "$(ls "$HARNESS_WORKDIR"/src/*.js 2>/dev/null | wc -l | tr -d ' ')" = "5"
