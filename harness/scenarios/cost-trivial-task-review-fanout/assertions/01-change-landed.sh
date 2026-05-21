#!/usr/bin/env bash
# Verify the trivial one-line change actually landed, so the run is not
# a no-op the cost numbers would otherwise be measured against.
set -euo pipefail
if grep -qF "console.log('app started')" "$HARNESS_WORKDIR/src/app.js"; then
    echo "PASS: the console.log change landed in src/app.js"
    exit 0
fi
echo "FAIL: src/app.js does not contain the expected console.log"
exit 1
