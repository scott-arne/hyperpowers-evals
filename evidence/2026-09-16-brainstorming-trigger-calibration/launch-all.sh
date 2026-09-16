#!/usr/bin/env bash
# launch-all.sh <manifest.tsv> [max-concurrent]
# Runs every four-field row of the manifest (arm, scenario, repeat, proc)
# through the launcher, at most N at a time (default 8), waits for every child,
# and fails closed: a malformed row, a child that exits non-zero, or a manifest
# row whose log is missing or does not end with DONE makes the exit status 1
# and the closing line say so. LAUNCHER overrides the launcher path (the stub
# test uses it); the default is logs/measure-launch.sh beside the manifest.
set -uo pipefail
manifest="$1"; max="${2:-8}"
E=$(cd "$(dirname "$manifest")" && pwd)
launcher="${LAUNCHER:-$E/logs/measure-launch.sh}"
[ -f "$manifest" ] || { echo "no manifest at $manifest" >&2; exit 1; }
[ -x "$launcher" ] || [ -f "$launcher" ] || { echo "no launcher at $launcher" >&2; exit 1; }
rows=(); pids=(); labels=(); bad=0
while IFS=$'\t' read -r arm scen rep proc; do
  case "$arm" in control|treatment) ;; *) continue ;; esac
  [ -n "$proc" ] || continue
  case "$proc" in p[0-9]|p[0-9][0-9]) ;; *) echo "malformed proc id '$proc' in row $arm $scen" >&2; bad=1; continue ;; esac
  case "$rep" in [1-9]|[1-9][0-9]) ;; *) echo "malformed repeat '$rep' in row $arm $scen $proc" >&2; bad=1; continue ;; esac
  rows+=("$arm-$scen-$proc")
  while [ "$(jobs -rp | wc -l | tr -d ' ')" -ge "$max" ]; do sleep 15; done
  bash "$launcher" "$arm" "$scen" "$rep" "$proc" &
  pids+=("$!"); labels+=("$arm $scen x$rep $proc"); echo "started $arm $scen x$rep $proc ($(date -u +%H:%M:%SZ))"
done < "$manifest"
[ "$bad" -eq 0 ] || { echo "manifest has malformed rows; nothing else is trusted" >&2; wait; exit 1; }
[ "${#pids[@]}" -gt 0 ] || { echo "manifest has no launch rows" >&2; exit 1; }
failed_children=0
for i in "${!pids[@]}"; do
  if ! wait "${pids[$i]}"; then echo "launcher exited non-zero: ${labels[$i]}" >&2; failed_children=$((failed_children + 1)); fi
done
missing=0
for row in "${rows[@]}"; do
  log="$E/logs/$row.log"
  if [ ! -f "$log" ]; then echo "no log for $row" >&2; missing=$((missing + 1)); continue; fi
  tail -n 1 "$log" | grep -q "^DONE " || { echo "log for $row does not end with DONE" >&2; missing=$((missing + 1)); }
done
echo "all launches finished; launchers non-zero: $failed_children; manifest rows without a DONE log: $missing"
[ "$failed_children" -eq 0 ] && [ "$missing" -eq 0 ]
