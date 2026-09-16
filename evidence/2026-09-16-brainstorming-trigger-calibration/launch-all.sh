#!/usr/bin/env bash
# launch-all.sh <manifest.tsv> [max-concurrent]
# Validates every row of the manifest first, then runs every four-field row
# (arm, scenario, repeat, proc) through the launcher, at most N at a time
# (default 8), waits for every child, and fails closed: a malformed or
# duplicate row stops the campaign before anything is launched; a child that
# exits non-zero, or a manifest row whose log is missing or does not end with
# DONE, makes the exit status 1 and the closing line say so. LAUNCHER
# overrides the launcher path (the stub test uses it); the default is
# logs/measure-launch.sh beside the manifest.
set -uo pipefail
manifest="$1"; max="${2:-8}"
E=$(cd "$(dirname "$manifest")" && pwd)
launcher="${LAUNCHER:-$E/logs/measure-launch.sh}"
[ -f "$manifest" ] || { echo "no manifest at $manifest" >&2; exit 1; }
[ -x "$launcher" ] || [ -f "$launcher" ] || { echo "no launcher at $launcher" >&2; exit 1; }
arms=(); scens=(); reps=(); procs=(); keys=" "; bad=0
while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in ''|'#'*) continue ;; esac
  IFS=$'\t' read -r -a f <<< "$line"
  case "${#f[@]}" in
    2) case "${f[0]}" in harness|control|treatment|model) continue ;; esac
       echo "malformed row '$line'" >&2; bad=1; continue ;;
    4) ;;
    *) echo "malformed row '$line'" >&2; bad=1; continue ;;
  esac
  arm="${f[0]}"; scen="${f[1]}"; rep="${f[2]}"; proc="${f[3]}"
  case "$arm" in control|treatment) ;; *) echo "malformed arm '$arm' in row '$line'" >&2; bad=1; continue ;; esac
  case "$proc" in p[0-9]|p[0-9][0-9]) ;; *) echo "malformed proc id '$proc' in row $arm $scen" >&2; bad=1; continue ;; esac
  case "$rep" in [1-9]|[1-9][0-9]) ;; *) echo "malformed repeat '$rep' in row $arm $scen $proc" >&2; bad=1; continue ;; esac
  case "$keys" in *" $arm-$scen-$proc "*) echo "duplicate row $arm $scen $proc" >&2; bad=1; continue ;; esac
  keys="$keys$arm-$scen-$proc "
  arms+=("$arm"); scens+=("$scen"); reps+=("$rep"); procs+=("$proc")
done < "$manifest"
[ "$bad" -eq 0 ] || { echo "manifest has malformed rows; nothing was launched" >&2; exit 1; }
[ "${#arms[@]}" -gt 0 ] || { echo "manifest has no launch rows" >&2; exit 1; }
rows=(); pids=(); labels=()
for i in "${!arms[@]}"; do
  arm="${arms[$i]}"; scen="${scens[$i]}"; rep="${reps[$i]}"; proc="${procs[$i]}"
  rows+=("$arm-$scen-$proc")
  while [ "$(jobs -rp | wc -l | tr -d ' ')" -ge "$max" ]; do sleep 15; done
  bash "$launcher" "$arm" "$scen" "$rep" "$proc" &
  pids+=("$!"); labels+=("$arm $scen x$rep $proc"); echo "started $arm $scen x$rep $proc ($(date -u +%H:%M:%SZ))"
done
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
