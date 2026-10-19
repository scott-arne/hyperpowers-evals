#!/usr/bin/env bash
# launch-all.sh <campaign-root> <baseline-worktree> <new-worktree>
# Sequential, alternating: B p1, N p1, B p2, N p2, ... Each launch is classified
# by the analyzer's own `tally.py classify`. Before a launch's row is written,
# the launcher mirrors four of the analyzer's integrity checks: one run-id line
# per log, a run id that is one directory name, no run id twice in the campaign,
# at most one result file. Any of them stops the campaign at once, and so does a
# qa-agent-misconfigured run in either arm: the analyzer stops on each, so the
# remaining slots would only spend live sessions on a campaign it will reject.
# The analyzer's own checks still decide; these only stop a doomed run early.
# Exit: 0 complete; 1 bad input, or a launch the tally cannot use; 2 an arm-setup
# stop; 3 a void cap, the relaunch bound or the qualifying count.
# Plain bash 3.2 (macOS /bin/bash is the only bash on this host): per-arm state
# lives in scalar variables addressed by name (${!name} to read, printf -v to
# write, both bash 3.1+), never in associative arrays. Counters are mutated in
# the current shell, never inside $(...), where the change would be lost.
set -uo pipefail
usage="usage: launch-all.sh <absolute-campaign-root> <baseline-worktree> <new-worktree>"
[ "$#" -eq 3 ] || { echo "$usage" >&2; exit 1; }
root="$1"; tree_baseline="$2"; tree_new="$3"
# quorum resolves --out-root inside the worktree and this script from its own
# cwd, so a relative root would only be found missing after a full session.
case "$root" in /*) ;; *) echo "$usage: campaign root '$root' is not absolute" >&2; exit 1 ;; esac
[ -d "$tree_baseline" ] || { echo "$usage: no baseline worktree at '$tree_baseline'" >&2; exit 1; }
[ -d "$tree_new" ] || { echo "$usage: no new worktree at '$tree_new'" >&2; exit 1; }
here="$(cd "$(dirname "$0")" && pwd -P)"
out="${OUT_DIR:-$here}"                      # manifest.tsv and logs/ go here; tests use a temp dir
tally="${TALLY:-$here/../tally.py}"; scenario="${SCENARIO:-cost-api-field-rename-boundary}"
run_cmd="${QUORUM_RUN_CMD:-bun run quorum run}"
manifest="$out/manifest.tsv"
# A second start would truncate the first attempt's manifest and overwrite its logs.
[ ! -e "$manifest" ] || { echo "a manifest already exists at $manifest; not starting" >&2; exit 1; }
printf 'seq\tarm\tproc\trun_id\texit\tkind\tnote\n' > "$manifest"
q_baseline=0; q_new=0; gv_baseline=0; gv_new=0; rl_baseline=0; rl_new=0; rn_baseline=0; rn_new=0; seq=0
seen=" "                                     # every run id this campaign has launched, space-separated
id_shape='^[A-Za-z0-9][A-Za-z0-9._-]*$'      # tally.py's RUN_ID_SHAPE
get() { local v="$1_$2"; printf '%s' "${!v}"; }                           # get <prefix> <arm>
bump() { local v="$1_$2"; printf -v "$v" '%s' "$(( ${!v} + 1 ))"; }        # bump <prefix> <arm>, in this shell
stop() { printf 'stop\t%s\n' "$2" >> "$manifest"; echo "stop: $2" >&2; exit "$1"; }
launch() {  # launch <arm> <proc> <note>
  local arm="$1" proc="$2" note="$3" log rc run_id kind res n_res f
  mkdir -p "$out/logs/$arm"; log="$out/logs/$arm/control-$scenario-$proc.log"
  (cd "$(get tree "$arm")" && $run_cmd "scenarios/$scenario" --coding-agent claude-auto --out-root "$root") > "$log" 2>&1; rc=$?
  run_id="$(sed -n 's/^run-id: //p' "$log" | tail -1)"
  [ -n "$run_id" ] || stop 1 "no run-id in $log (rc=$rc)"
  [ "$(grep -c '^run-id: ' "$log")" -eq 1 ] || stop 1 "multiple run-ids in $log (rc=$rc)"
  # The shape is checked before any path is built from the id.
  [[ $run_id =~ $id_shape ]] || stop 1 "bad run-id $run_id in $log"
  case "$seen" in *" $run_id "*) stop 1 "repeated run-id $run_id" ;; esac
  seen="$seen$run_id "
  # A void run has no result.json, and the analyzer rejects a run with more than
  # one, so count them instead of taking the first. An unmatched glob stays a
  # literal path in bash 3.2, hence the -e test; the optional argument is passed
  # only when there is exactly one.
  res=""; n_res=0
  for f in "$root/$run_id"/gauntlet-agent/results/*/result.json; do
    [ -e "$f" ] || continue
    res="$f"; n_res=$((n_res + 1))
  done
  [ "$n_res" -le 1 ] || stop 1 "result files=$n_res for $run_id"
  if [ -n "$res" ]; then kind="$(python3 "$tally" classify "$root/$run_id/verdict.json" "$res" 2>>"$log")"; else kind="$(python3 "$tally" classify "$root/$run_id/verdict.json" 2>>"$log")"; fi || stop 1 "classify failed for $run_id (rc=$rc)"
  seq=$((seq + 1)); printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$seq" "$arm" "$proc" "$run_id" "$rc" "$kind" "$note" >> "$manifest"
  case "$arm:$kind" in
    new:void-harness-setup|new:qa-agent-misconfigured) stop 2 "new-arm-setup $run_id" ;;
    # The analyzer stops on this in the baseline arm too (an integrity failure,
    # exit 2), so the row is kept and nothing further is launched.
    baseline:qa-agent-misconfigured) stop 2 "baseline-qa-misconfigured $run_id" ;;
    baseline:void-harness-setup)
      bump rl "$arm"; [ "$(get rl "$arm")" -le 3 ] || stop 3 "relaunch bound $arm"
      bump rn "$arm"; launch "$arm" "r$(get rn "$arm")" "relaunch of $proc (setup void, cap untouched)" ;;
    *:void-grader-exit)
      bump gv "$arm"; [ "$(get gv "$arm")" -le 3 ] || stop 3 "void-cap $arm"
      bump rn "$arm"; launch "$arm" "r$(get rn "$arm")" "replaces $proc (grader-exit void $(get gv "$arm")/3)" ;;
    *) bump q "$arm" ;;
  esac
}
for i in 1 2 3 4 5 6 7 8 9 10; do launch baseline "p$i" ""; launch new "p$i" ""; done
[ "$(get q baseline)" -eq 10 ] && [ "$(get q new)" -eq 10 ] || stop 3 "qualifying baseline=$(get q baseline) new=$(get q new)"
echo "complete: 10 qualifying per arm; manifest $manifest"
