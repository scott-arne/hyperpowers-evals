#!/usr/bin/env bash
# stub-launch.sh <arm> <scenario> <repeat> <proc> <budget>
# Stand-in for measure-launch.sh in launch-all.sh's fail-closed check: p1 writes
# a complete log (with this launch's nonce line) ending in DONE, p2 exits 3
# without a log, p3 writes a log whose last line is FAILED. Never runs quorum.
E=$(cd "$(dirname "$0")" && pwd)
case "$4" in
  p1) printf 'arm=%s budget=%s\nnonce=%s\nDONE %s %s %s\n' "$1" "$5" "${LAUNCH_NONCE:-manual}" "$1" "$2" "$4" > "$E/logs/$1-$2-$4.log" ;;
  p2) exit 3 ;;
  p3) printf 'arm=%s\nnonce=%s\nEXIT=9\nFAILED 9\n' "$1" "${LAUNCH_NONCE:-manual}" > "$E/logs/$1-$2-$4.log" ;;
esac
