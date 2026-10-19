#!/usr/bin/env bash
# launch-all.sh <campaign-root> <baseline-worktree> <new-worktree>
# Sequential, alternating: B p1, N p1, B p2, N p2, ... Each launch is classified
# by the analyzer's own `tally.py classify`. Before a launch's row is written,
# the launcher stops the campaign on what the analyzer's integrity checks would
# reject: more than one run-id line in the log, a run id that is not one
# directory name, a run id seen before in either arm, and a graded run without
# exactly one result file of the shape criterion 1 reads (judged by the
# analyzer's own result_files and read_result). It also stops on a
# qa-agent-misconfigured run in either arm. Running the remaining slots would
# only spend live sessions on a campaign the analyzer will reject. Some guards
# are stricter than the analyzer (a padded or empty run-id line counts here,
# where the analyzer's pattern skips it), and the analyzer makes checks the
# launcher does not (linked or aliased runs, transcripts), so its verdict still
# decides.
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
mkdir -p "$out" || { echo "cannot create OUT_DIR $out" >&2; exit 1; }
# The manifest is claimed exclusively: under noclobber bash creates it with
# O_EXCL, so of two starts into one OUT_DIR only one gets past here, and a
# re-run can never truncate an earlier attempt's manifest or overwrite its logs.
( set -C; printf 'seq\tarm\tproc\trun_id\texit\tkind\tnote\n' > "$manifest" ) 2>/dev/null \
  || { echo "manifest exists or cannot be created: $manifest; not starting" >&2; exit 1; }
q_baseline=0; q_new=0; gv_baseline=0; gv_new=0; rl_baseline=0; rl_new=0; rn_baseline=0; rn_new=0; seq=0
seen=" "                                     # every run id this campaign has launched, space-separated
id_shape='^[A-Za-z0-9][A-Za-z0-9._-]*$'      # tally.py's RUN_ID_SHAPE
# The analyzer's reading of a run's result evidence, imported from tally.py
# rather than restated: a graded verdict (final pass or fail and no error, the
# test at its result-cardinality check) needs exactly one result_files() entry
# that read_result() accepts, and classify is handed a result only when
# read_result() accepts one, as the analyzer hands it one. Prints
# "reject <reason>", "result <path>", or nothing.
evidence_py='
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(sys.argv[1]).resolve().parent))
import tally
run = Path(sys.argv[2])
verdict = json.loads((run / "verdict.json").read_text(encoding="utf-8"))
found = tally.result_files(run)
result, flaw = tally.read_result(found)
graded = verdict.get("final") in ("pass", "fail") and not verdict.get("error")
if graded and len(found) != 1:
    print(f"reject result-cardinality={len(found)}")
elif graded and flaw:
    print(f"reject result-invalid={flaw}")
elif result is not None:
    print(f"result {found[0]}")
'
get() { local v="$1_$2"; printf '%s' "${!v}"; }                           # get <prefix> <arm>
bump() { local v="$1_$2"; printf -v "$v" '%s' "$(( ${!v} + 1 ))"; }        # bump <prefix> <arm>, in this shell
stop() {  # stop <exit> <reason>; a stop line that cannot be written is exit 1
  printf 'stop\t%s\n' "$2" >> "$manifest" || { echo "cannot append the stop line to $manifest: $2" >&2; exit 1; }
  echo "stop: $2" >&2; exit "$1"
}
launch() {  # launch <arm> <proc> <note>
  local arm="$1" proc="$2" note="$3" log rc run_id kind res evidence
  mkdir -p "$out/logs/$arm"; log="$out/logs/$arm/control-$scenario-$proc.log"
  (cd "$(get tree "$arm")" && $run_cmd "scenarios/$scenario" --coding-agent claude-auto --out-root "$root") > "$log" 2>&1; rc=$?
  run_id="$(sed -n 's/^run-id: //p' "$log" | tail -1)"
  [ -n "$run_id" ] || stop 1 "no run-id in $log (rc=$rc)"
  [ "$(grep -c '^run-id: ' "$log")" -eq 1 ] || stop 1 "multiple run-ids in $log (rc=$rc)"
  # The shape is checked before any path is built from the id.
  [[ $run_id =~ $id_shape ]] || stop 1 "bad run-id $run_id in $log (rc=$rc)"
  case "$seen" in *" $run_id "*) stop 1 "repeated run-id $run_id in $log (rc=$rc)" ;; esac
  seen="$seen$run_id "
  # -I keeps the caller's cwd and PYTHON* settings out of the import; -B keeps
  # bytecode out of the evidence directory.
  evidence="$(python3 -B -I -c "$evidence_py" "$tally" "$root/$run_id" 2>>"$log")" \
    || stop 1 "result check failed for $run_id (rc=$rc)"
  case "$evidence" in
    "") res="" ;;
    "result "*) res="${evidence#result }" ;;
    "reject "*) stop 1 "${evidence#reject } for $run_id (rc=$rc)" ;;
    *) stop 1 "result check failed for $run_id (rc=$rc)" ;;
  esac
  if [ -n "$res" ]; then kind="$(python3 "$tally" classify "$root/$run_id/verdict.json" "$res" 2>>"$log")"; else kind="$(python3 "$tally" classify "$root/$run_id/verdict.json" 2>>"$log")"; fi || stop 1 "classify failed for $run_id (rc=$rc)"
  seq=$((seq + 1))
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$seq" "$arm" "$proc" "$run_id" "$rc" "$kind" "$note" >> "$manifest" \
    || { echo "cannot append row $seq to $manifest" >&2; exit 1; }
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
