#!/usr/bin/env bash
# wait-done.sh <file> <iterations>
# A bounded foreground wait for a detached launcher's closing line: checks
# <file> every 60 s, at most <iterations> times (9 fits one 600000 ms call).
# Exit 0 when the closing line is there, 3 when the bound is reached first,
# 1 on a read error, so a failure the loop cannot parse is never read as
# "not done yet".
set -uo pipefail
file="$1"; n="$2"
case "$n" in ''|*[!0-9]*) echo "iterations must be a positive integer" >&2; exit 2 ;; esac
i=0
while [ "$i" -lt "$n" ]; do
  if [ -e "$file" ]; then
    last=$(tail -n 1 "$file") || { echo "cannot read $file" >&2; exit 1; }
    case "$last" in "all launches finished;"*) echo "$last"; exit 0 ;; esac
  fi
  i=$((i + 1))
  sleep 60
done
echo "still running after $n checks; last line: $(tail -n 1 "$file" 2>/dev/null)"
exit 3
