#!/usr/bin/env bash
# The agent must actually look at the code — at least one Read or Grep.
# A "didn't investigate" run measures refusal, not a cost pattern.
set -euo pipefail
if tool-called Read >/dev/null 2>&1 || tool-called Grep >/dev/null 2>&1; then
    echo "PASS: agent investigated (Read or Grep called)"
    exit 0
fi
echo "FAIL: agent called neither Read nor Grep"
exit 1
