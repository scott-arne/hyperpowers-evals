#!/usr/bin/env bash
# The agent must have produced a brainstorming-style spec doc.
set -euo pipefail
if ls "$HARNESS_WORKDIR"/docs/superpowers/specs/*.md >/dev/null 2>&1; then
    echo "PASS: spec doc produced under docs/superpowers/specs/"
    exit 0
fi
echo "FAIL: no spec doc under docs/superpowers/specs/"
exit 1
