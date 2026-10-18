#!/usr/bin/env bash
# launch-all.sh <campaign-root> <baseline-worktree> <new-worktree>
# Sequential, alternating: B p1, N p1, B p2, N p2, ... Each launch is classified
# by tally.py so the launcher and the analyzer can never disagree on a kind.
# Plain bash 3.2 (macOS /bin/bash is the only bash on this host): per-arm state
# lives in scalar variables addressed by name (${!name} to read, printf -v to
# write, both bash 3.1+), never in associative arrays. Counters are mutated in
# the current shell, never inside $(...), where the change would be lost.
set -uo pipefail
root="$1"; tree_baseline="$2"; tree_new="$3"
here="$(cd "$(dirname "$0")" && pwd -P)"
out="${OUT_DIR:-$here}"                      # manifest.tsv and logs/ go here; tests use a temp dir
tally="${TALLY:-$here/../tally.py}"; scenario="${SCENARIO:-cost-api-field-rename-boundary}"
run_cmd="${QUORUM_RUN_CMD:-bun run quorum run}"
manifest="$out/manifest.tsv"; printf 'seq\tarm\tproc\trun_id\texit\tkind\tnote\n' > "$manifest"
q_baseline=0; q_new=0; gv_baseline=0; gv_new=0; rl_baseline=0; rl_new=0; rn_baseline=0; rn_new=0; seq=0
get() { local v="$1_$2"; printf '%s' "${!v}"; }                           # get <prefix> <arm>
bump() { local v="$1_$2"; printf -v "$v" '%s' "$(( ${!v} + 1 ))"; }        # bump <prefix> <arm>, in this shell
stop() { printf 'stop\t%s\n' "$2" >> "$manifest"; echo "stop: $2" >&2; exit "$1"; }
launch() {  # launch <arm> <proc> <note>
  local arm="$1" proc="$2" note="$3" log rc run_id kind
  mkdir -p "$out/logs/$arm"; log="$out/logs/$arm/control-$scenario-$proc.log"
  (cd "$(get tree "$arm")" && $run_cmd "scenarios/$scenario" --coding-agent claude-auto --out-root "$root") > "$log" 2>&1; rc=$?
  run_id="$(sed -n 's/^run-id: //p' "$log" | tail -1)"
  [ -n "$run_id" ] || stop 1 "no run-id in $log"
  # A void run has no result.json; bash 3.2 would pass an unmatched glob as a
  # literal path, so resolve it first and omit the optional argument when absent.
  res="$(ls "$root/$run_id"/gauntlet-agent/results/*/result.json 2>/dev/null | head -1)"
  if [ -n "$res" ]; then kind="$(python3 "$tally" classify "$root/$run_id/verdict.json" "$res" 2>>"$log")"; else kind="$(python3 "$tally" classify "$root/$run_id/verdict.json" 2>>"$log")"; fi || stop 1 "classify failed for $run_id"
  seq=$((seq + 1)); printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$seq" "$arm" "$proc" "$run_id" "$rc" "$kind" "$note" >> "$manifest"
  case "$arm:$kind" in
    new:void-harness-setup|new:qa-agent-misconfigured) stop 2 "new-arm-setup $run_id" ;;
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
