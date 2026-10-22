#!/usr/bin/env bash
# notes.sh add TEXT | list : a tiny notes CLI backed by notes.txt.
set -euo pipefail
FILE="${NOTES_FILE:-notes.txt}"
case "${1:-}" in
  add) shift; printf '%s\n' "$*" >> "$FILE" ;;
  list) [ -f "$FILE" ] && cat "$FILE" || true ;;
  *) echo "usage: notes.sh add TEXT | list" >&2; exit 64 ;;
esac
