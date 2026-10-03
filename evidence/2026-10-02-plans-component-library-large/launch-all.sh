#!/usr/bin/env bash
# launch-all.sh <manifest.tsv> [max-concurrent]
# Validates every row of the manifest first, then runs every five-field row
# (arm, scenario, repeat, proc, budget; budget is always `default` in this
# campaign) through the launcher, at most N at a time (default 8), waits for
# every child, and fails closed: a malformed row (wrong field count, an empty
# field, a misspelled arm, a bad proc, repeat, or a budget other than default)
# or a duplicate row stops the campaign before anything is launched; a child
# that exits non-zero, or a manifest row whose log is missing or does not end
# with DONE, makes the exit status 1 and the closing line say so. LAUNCHER
# overrides the launcher path (the stub test uses it); the default is
# logs/measure-launch.sh beside the manifest. The manifest is exported to the
# launcher as MANIFEST so its pins come from the same file; LOGS names the log
# directory both scripts use (default logs/ beside the manifest).
#
# Each child writes its own exit status to a scratch file and the final reap is
# a bare `wait`. The capacity poll forks for as long as the campaign runs, and
# once process ids wrap, one of those forks can be handed the pid of a launcher
# that has already exited. bash then discards that launcher's saved status, so
# a `wait <pid>` deferred to the end returns 127 ("not a child of this shell")
# for a launcher that succeeded. Campaign 2 recorded exactly that false failure
# (evidence/2026-09-17-brainstorming-trigger-rule/logs/launch-all.out).
#
# Copied from ../2026-10-02-plans-component-library-hard/launch-all.sh with no
# change apart from this line.
set -uo pipefail
manifest="$1"; max="${2:-8}"
case "$max" in ''|*[!0-9]*) echo "max-concurrent must be a positive integer, got '$max'" >&2; exit 2 ;; esac
[ "$max" -gt 0 ] || { echo "max-concurrent must be a positive integer, got '$max'" >&2; exit 2; }
E=$(cd "$(dirname "$manifest")" && pwd)
launcher="${LAUNCHER:-$E/logs/measure-launch.sh}"
export MANIFEST="$E/$(basename "$manifest")"
logs="${LOGS:-$E/logs}"
[ -f "$manifest" ] || { echo "no manifest at $manifest" >&2; exit 1; }
[ -x "$launcher" ] || [ -f "$launcher" ] || { echo "no launcher at $launcher" >&2; exit 1; }
arms=(); scens=(); reps=(); procs=(); budgets=(); keys=" "; bad=0; tab=$'\t'
while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in ''|'#'*) continue ;; esac
  case "$line" in "$tab"*|*"$tab"|*"$tab$tab"*) echo "malformed row '$line' (empty field)" >&2; bad=1; continue ;; esac
  ntab=$(printf '%s' "$line" | tr -cd '\t' | wc -c | tr -d ' ')
  IFS=$'\t' read -r -a f <<< "$line"
  [ "${#f[@]}" -eq $((ntab + 1)) ] || { echo "malformed row '$line'" >&2; bad=1; continue; }
  case "${#f[@]}" in
    2) case "${f[0]}" in harness|v612|head|model) continue ;; esac
       echo "malformed row '$line'" >&2; bad=1; continue ;;
    5) ;;
    *) echo "malformed row '$line'" >&2; bad=1; continue ;;
  esac
  arm="${f[0]}"; scen="${f[1]}"; rep="${f[2]}"; proc="${f[3]}"; budget="${f[4]}"
  case "$arm" in v612|head) ;; *) echo "malformed arm '$arm' in row '$line'" >&2; bad=1; continue ;; esac
  case "$proc" in p[0-9]|p[0-9][0-9]) ;; *) echo "malformed proc id '$proc' in row $arm $scen" >&2; bad=1; continue ;; esac
  case "$rep" in [1-9]|[1-9][0-9]) ;; *) echo "malformed repeat '$rep' in row $arm $scen $proc" >&2; bad=1; continue ;; esac
  case "$budget" in default) ;; *) echo "malformed budget '$budget' in row $arm $scen $proc" >&2; bad=1; continue ;; esac
  case "$keys" in *" $arm-$scen-$proc "*) echo "duplicate row $arm $scen $proc" >&2; bad=1; continue ;; esac
  keys="$keys$arm-$scen-$proc "
  arms+=("$arm"); scens+=("$scen"); reps+=("$rep"); procs+=("$proc"); budgets+=("$budget")
done < "$manifest"
[ "$bad" -eq 0 ] || { echo "manifest has malformed rows; nothing was launched" >&2; exit 1; }
[ "${#arms[@]}" -gt 0 ] || { echo "manifest has no launch rows" >&2; exit 1; }
tmp="${TMPDIR:-/tmp}"
status_dir=$(mktemp -d "${tmp%/}/launch-all.XXXXXX") || { echo "cannot create a status directory; nothing was launched" >&2; exit 1; }
trap 'rm -rf "$status_dir"' EXIT
rows=(); labels=()
for i in "${!arms[@]}"; do
  arm="${arms[$i]}"; scen="${scens[$i]}"; rep="${reps[$i]}"; proc="${procs[$i]}"; budget="${budgets[$i]}"
  rows+=("$arm-$scen-$proc")
  while [ "$(jobs -rp | wc -l | tr -d ' ')" -ge "$max" ]; do sleep 15; done
  ( bash "$launcher" "$arm" "$scen" "$rep" "$proc" "$budget"; echo "$?" > "$status_dir/$i" ) &
  labels+=("$arm $scen x$rep $proc $budget"); echo "started $arm $scen x$rep $proc $budget ($(date -u +%H:%M:%SZ))"
done
wait
failed_children=0
for i in "${!labels[@]}"; do
  status=$(cat "$status_dir/$i" 2>/dev/null)
  # A missing file means the child died before recording a status; that fails closed too.
  [ "$status" = 0 ] || { echo "launcher exited non-zero: ${labels[$i]} (status ${status:-unrecorded})" >&2; failed_children=$((failed_children + 1)); }
done
missing=0
for row in "${rows[@]}"; do
  log="$logs/$row.log"
  if [ ! -f "$log" ]; then echo "no log for $row" >&2; missing=$((missing + 1)); continue; fi
  tail -n 1 "$log" | grep -q "^DONE " || { echo "log for $row does not end with DONE" >&2; missing=$((missing + 1)); }
done
echo "all launches finished; launchers non-zero: $failed_children; manifest rows without a DONE log: $missing"
[ "$failed_children" -eq 0 ] && [ "$missing" -eq 0 ]
