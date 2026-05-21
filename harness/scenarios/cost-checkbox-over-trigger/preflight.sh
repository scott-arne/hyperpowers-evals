#!/usr/bin/env bash
# Fixture invariants — a single empty page with no checkbox yet, so the
# trivial request has somewhere obvious to land.
set -euo pipefail
git -C "$HARNESS_WORKDIR" rev-parse --is-inside-work-tree >/dev/null
test "$(git -C "$HARNESS_WORKDIR" branch --show-current)" = "main"
test -f "$HARNESS_WORKDIR/index.html"
if grep -qi checkbox "$HARNESS_WORKDIR/index.html"; then
    echo "preflight FAIL: index.html already contains a checkbox" >&2
    exit 1
fi
