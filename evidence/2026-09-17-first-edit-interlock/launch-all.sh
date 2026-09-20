#!/usr/bin/env bash
# launch-all.sh <manifest.tsv> [max-concurrent] [arm]
# Validates every row of the manifest first, then runs every five-field row
# (arm, scenario, repeat, proc, budget) through the launcher, at most N at a
# time (default 8), waits for every child, and fails closed: a malformed row
# (wrong field count, an empty field, a misspelled arm, a bad proc, repeat, or
# budget) or a duplicate row stops the campaign before anything is launched;
# a manifest row whose log is missing, was written by an earlier launch (its
# nonce line is not this launch's), or does not end with its own DONE line
# makes the exit status 1 and the closing line say so, so a launcher that
# fails before it opens its log can never hide behind a stale log. The exit
# status follows that DONE-log sweep alone: `wait` on a child the job-control throttle has
# already reaped reports "not a child of this shell", which is bookkeeping,
# not a failed launch, so it is counted and printed but never decides the
# status. An optional third argument narrows the launch to one arm: every row
# is still validated, so a manifest broken anywhere still stops the campaign
# before anything is launched, but only the named arm's rows are launched and
# only those rows are swept for a DONE log. That is what lets one arm be
# re-measured while the other arms' logs are reused: those logs carry an
# earlier launch's nonce, and a sweep over the whole manifest would read every
# one of them as stale. LAUNCHER overrides the launcher path (the stub test
# uses it); the default is logs/measure-launch.sh beside the manifest.
set -uo pipefail
manifest="$1"; max="${2:-8}"; only_arm="${3:-}"
case "$max" in ''|*[!0-9]*) echo "max-concurrent must be a positive integer, got '$max'" >&2; exit 2 ;; esac
[ "$max" -gt 0 ] || { echo "max-concurrent must be a positive integer, got '$max'" >&2; exit 2; }
case "$only_arm" in ''|control|wording|full) ;; *) echo "arm filter must be control, wording, or full, got '$only_arm'" >&2; exit 2 ;; esac
E=$(cd "$(dirname "$manifest")" && pwd)
launcher="${LAUNCHER:-$E/logs/measure-launch.sh}"
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
    2) case "${f[0]}" in harness|control|wording|full|model|claude_code) continue ;; esac
       echo "malformed row '$line'" >&2; bad=1; continue ;;
    5) ;;
    *) echo "malformed row '$line'" >&2; bad=1; continue ;;
  esac
  arm="${f[0]}"; scen="${f[1]}"; rep="${f[2]}"; proc="${f[3]}"; budget="${f[4]}"
  case "$arm" in control|wording|full) ;; *) echo "malformed arm '$arm' in row '$line'" >&2; bad=1; continue ;; esac
  case "$proc" in p[0-9]|p[0-9][0-9]|p[0-9][0-9][0-9]) ;; *) echo "malformed proc id '$proc' in row $arm $scen" >&2; bad=1; continue ;; esac
  case "$rep" in [1-9]|[1-9][0-9]) ;; *) echo "malformed repeat '$rep' in row $arm $scen $proc" >&2; bad=1; continue ;; esac
  case "$budget" in default) ;; *) echo "malformed budget '$budget' in row $arm $scen $proc" >&2; bad=1; continue ;; esac
  case "$keys" in *" $arm-$scen-$proc "*) echo "duplicate row $arm $scen $proc" >&2; bad=1; continue ;; esac
  keys="$keys$arm-$scen-$proc "
  [ -z "$only_arm" ] || [ "$arm" = "$only_arm" ] || continue
  arms+=("$arm"); scens+=("$scen"); reps+=("$rep"); procs+=("$proc"); budgets+=("$budget")
done < "$manifest"
[ "$bad" -eq 0 ] || { echo "manifest has malformed rows; nothing was launched" >&2; exit 1; }
[ "${#arms[@]}" -gt 0 ] || { echo "manifest has no launch rows${only_arm:+ in arm $only_arm}" >&2; exit 1; }
LAUNCH_NONCE="$(date -u +%Y%m%dT%H%M%SZ)-$$"; export LAUNCH_NONCE
echo "launch nonce $LAUNCH_NONCE"
[ -z "$only_arm" ] || echo "arm filter $only_arm: ${#arms[@]} rows selected; rows in the other arms were validated, then neither launched nor swept"
rows=(); dones=(); pids=(); labels=()
for i in "${!arms[@]}"; do
  arm="${arms[$i]}"; scen="${scens[$i]}"; rep="${reps[$i]}"; proc="${procs[$i]}"; budget="${budgets[$i]}"
  rows+=("$arm-$scen-$proc"); dones+=("DONE $arm $scen $proc")
  while [ "$(jobs -rp | wc -l | tr -d ' ')" -ge "$max" ]; do sleep 15; done
  bash "$launcher" "$arm" "$scen" "$rep" "$proc" "$budget" &
  pids+=("$!"); labels+=("$arm $scen x$rep $proc $budget"); echo "started $arm $scen x$rep $proc $budget ($(date -u +%H:%M:%SZ))"
done
wait_notes=0
for i in "${!pids[@]}"; do
  if ! wait "${pids[$i]}" 2>/dev/null; then echo "wait reported non-zero for: ${labels[$i]} (bookkeeping; the DONE sweep decides)" >&2; wait_notes=$((wait_notes + 1)); fi
done
missing=0
for i in "${!rows[@]}"; do
  row="${rows[$i]}"; log="$E/logs/$row.log"
  if [ ! -f "$log" ]; then echo "no log for $row" >&2; missing=$((missing + 1)); continue; fi
  if ! grep -q -x -F "nonce=$LAUNCH_NONCE" "$log"; then echo "log for $row is from an earlier launch (nonce mismatch)" >&2; missing=$((missing + 1)); continue; fi
  [ "$(tail -n 1 "$log")" = "${dones[$i]}" ] || { echo "log for $row does not end with DONE" >&2; missing=$((missing + 1)); }
done
echo "all launches finished; wait notes: $wait_notes; selected rows without a DONE log: $missing"
[ "$missing" -eq 0 ]
