#!/usr/bin/env bash
# The agent must have produced a plan doc.
set -euo pipefail
if ls "$HARNESS_WORKDIR"/docs/superpowers/plans/*.md >/dev/null 2>&1; then
    echo "PASS: plan doc produced under docs/superpowers/plans/"
    exit 0
fi
echo "FAIL: no plan doc under docs/superpowers/plans/"
exit 1
