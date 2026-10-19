#!/usr/bin/env bash
# fake-quorum.sh run scenarios/<scenario> --coding-agent claude-auto --out-root <root>
# The launch-all test's stand-in for `quorum run`, invoked with exactly the
# arguments the launcher gives the real one (any other shape is refused, so the
# test also proves the invocation). Each call takes the next line of
# $FAKE_SCRIPT, a kind from ../fixtures/verdicts/ or `no-run-id`, and leaves the
# run a real launch of that kind would: verdict.json under <root>/<run_id>/,
# plus result.json for pass and fail only (a void run has none). It prints the
# run-id line and exits as `quorum run` does (src/cli/trials.ts: 0 pass, 1 fail,
# 2 otherwise). `no-run-id` writes and prints nothing and exits 1.
# Kinds for what the analyzer would reject, each otherwise a passing run (exit 0)
# so that only the launcher's own guard can stop it:
#   two-run-ids    a second passing run, and a second run-id line for it
#   bad-run-id     its run written and printed under an id with a '+' in it
#   repeat-run-id  prints the previous call's run id again and writes nothing
#   two-results    a second result.json, under results/g2/
# and `no-verdict`, a run id with no verdict.json behind it (exit 2), which the
# analyzer's classify cannot read.
# Everything it keeps lands beside $FAKE_SCRIPT, never beside this script:
# $FAKE_SCRIPT.pos holds the number of lines consumed, $FAKE_SCRIPT.last the
# last run id printed, and $FAKE_SCRIPT.trace records
# "<line>\t<run_id>\t<physical cwd>" per call, so the test can check that each
# manifest row is the launch it claims and ran in its arm's tree.
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd -P)"
fixtures="$here/../fixtures"
: "${FAKE_SCRIPT:?fake-quorum: FAKE_SCRIPT is not set}"
if [ "$#" -ne 6 ] || [ "$1" != run ] || [ "$3" != --coding-agent ] || [ "$4" != claude-auto ] || [ "$5" != --out-root ]; then
  echo "fake-quorum: unexpected invocation: $*" >&2; exit 64
fi
case "$2" in scenarios/?*) ;; *) echo "fake-quorum: bad scenario path '$2'" >&2; exit 64 ;; esac
SCENARIO="${2#scenarios/}"; root="$6"
pos="$FAKE_SCRIPT.pos"
n=$(( $(cat "$pos" 2>/dev/null || echo 0) + 1 ))
kind="$(sed -n "${n}p" "$FAKE_SCRIPT")"
[ -n "$kind" ] || { echo "fake-quorum: script exhausted at line $n" >&2; exit 65; }
printf '%s\n' "$n" > "$pos"
trace() { printf '%s\t%s\t%s\n' "$n" "$1" "$(pwd -P)" >> "$FAKE_SCRIPT.trace"; }
case "$kind" in
  no-run-id) trace ""; exit 1 ;;
  repeat-run-id)
    run_id="$(cat "$FAKE_SCRIPT.last" 2>/dev/null)"
    [ -n "$run_id" ] || { echo "fake-quorum: repeat-run-id with no earlier run id" >&2; exit 67; }
    trace "$run_id"; echo "run-id: $run_id"; exit 0 ;;
esac
case "$kind" in
  two-run-ids|bad-run-id|two-results) fixture=pass ;;
  no-verdict) fixture="" ;;
  *) fixture="$kind"
     [ -f "$fixtures/verdicts/$kind.json" ] || { echo "fake-quorum: no verdict fixture for '$kind'" >&2; exit 66; } ;;
esac
# write_run <run_id>: the files a run of $fixture leaves under the campaign root.
write_run() {
  mkdir -p "$root/$1"
  [ -z "$fixture" ] || cp "$fixtures/verdicts/$fixture.json" "$root/$1/verdict.json"
  case "$fixture" in
    pass|fail)
      mkdir -p "$root/$1/gauntlet-agent/results/g1"
      cp "$fixtures/results/$fixture.json" "$root/$1/gauntlet-agent/results/g1/result.json" ;;
  esac
}
# The line number keeps two launches in the same UTC second distinct.
run_id="$SCENARIO-claude-auto-$(date -u +%Y%m%dT%H%M%SZ)-$(printf '%04x' "$n")"
if [ "$kind" = bad-run-id ]; then run_id="$run_id+bad"; fi
trace "$run_id"
write_run "$run_id"
printf '%s\n' "$run_id" > "$FAKE_SCRIPT.last"
echo "run-id: $run_id"
case "$kind" in
  two-run-ids) write_run "$run_id-2"; echo "run-id: $run_id-2" ;;
  two-results)
    mkdir -p "$root/$run_id/gauntlet-agent/results/g2"
    cp "$fixtures/results/pass.json" "$root/$run_id/gauntlet-agent/results/g2/result.json" ;;
esac
case "$fixture" in pass) exit 0 ;; fail) exit 1 ;; *) exit 2 ;; esac
