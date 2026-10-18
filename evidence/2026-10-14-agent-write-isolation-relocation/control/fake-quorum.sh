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
# Everything it keeps lands beside $FAKE_SCRIPT, never beside this script:
# $FAKE_SCRIPT.pos holds the number of lines consumed, and $FAKE_SCRIPT.trace
# records "<line>\t<run_id>\t<physical cwd>" per call, so the test can check
# that each manifest row is the launch it claims and ran in its arm's tree.
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
if [ "$kind" = no-run-id ]; then
  printf '%s\t\t%s\n' "$n" "$(pwd -P)" >> "$FAKE_SCRIPT.trace"
  exit 1
fi
[ -f "$fixtures/verdicts/$kind.json" ] || { echo "fake-quorum: no verdict fixture for '$kind'" >&2; exit 66; }
# The line number keeps two launches in the same UTC second distinct.
run_id="$SCENARIO-claude-auto-$(date -u +%Y%m%dT%H%M%SZ)-$(printf '%04x' "$n")"
printf '%s\t%s\t%s\n' "$n" "$run_id" "$(pwd -P)" >> "$FAKE_SCRIPT.trace"
mkdir -p "$root/$run_id"
cp "$fixtures/verdicts/$kind.json" "$root/$run_id/verdict.json"
case "$kind" in
  pass|fail)
    mkdir -p "$root/$run_id/gauntlet-agent/results/g1"
    cp "$fixtures/results/$kind.json" "$root/$run_id/gauntlet-agent/results/g1/result.json" ;;
esac
echo "run-id: $run_id"
case "$kind" in pass) exit 0 ;; fail) exit 1 ;; *) exit 2 ;; esac
