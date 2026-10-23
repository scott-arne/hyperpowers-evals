#!/usr/bin/env bash
set -euo pipefail
NOTES_FILE="$(mktemp)"
export NOTES_FILE
bash notes.sh add "first note"
bash notes.sh add "second note"
[ "$(bash notes.sh list | wc -l | tr -d ' ')" = "2" ] || { echo "expected two lines" >&2; exit 1; }
sleep "${SUITE_SLEEP:-0}"
echo "ok"
exit 0
