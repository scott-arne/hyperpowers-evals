#!/usr/bin/env bash
# Proves lens-cohort.sh selects runs by mtime on this host: one batch older
# than the cutoff must vanish, one newer must count. Needs a hyperpowers
# checkout (arg 1) for verdict-normalize.
set -euo pipefail
root="${1:?hyperpowers root}"
here="$(cd "$(dirname "$0")" && pwd)"
work="$(mktemp -d "${TMPDIR:-/tmp}/lens-cohort-test.XXXXXX")"
trap 'rm -rf "$work"' EXIT
cache="$work/codex-review/key1"
mk() { # <run-name> <verdict> <title>
  mkdir -p "$cache/$1"
  for lens in correctness contracts-and-integration tests-and-evidence; do
    printf '{"storedJob":{"result":{"parseError":null,"result":{"verdict":"%s","findings":[%s],"summary":"Coverage: documents read - d; adjudicated decisions considered - none; changed surfaces reviewed - all; test evidence inspected - yes"},"rawOutput":"x"}}}\n' \
      "$2" "$( [ "$2" = needs-attention ] && printf '{"severity":"high","title":"%s"}' "$3" )" > "$cache/$1/lens-$lens-capture"
  done
}
mkbare() { # <run-name> <verdict> <title> -- the bare payload shape the code gates store
  mkdir -p "$cache/$1"
  for lens in correctness contracts-and-integration tests-and-evidence; do
    printf '{"verdict":"%s","findings":[%s],"summary":"Coverage: documents read - d; adjudicated decisions considered - none; changed surfaces reviewed - all; test evidence inspected - yes"}\n' \
      "$2" "$( [ "$2" = needs-attention ] && printf '{"severity":"high","title":"%s"}' "$3" )" > "$cache/$1/lens-$lens-capture"
  done
}
mkfinal() { # final-gate batch: correctness, integration-and-requirements-coverage, tests-and-evidence
  mkdir -p "$cache/run-final"
  for lens in correctness integration-and-requirements-coverage tests-and-evidence; do
    printf '{"verdict":"approve","findings":[],"summary":"Coverage: all"}\n' > "$cache/run-final/lens-$lens-capture"
  done
}
mkalias() { # alias batch: contracts, correctness, tests
  mkdir -p "$cache/run-alias"
  for lens in contracts correctness tests; do
    printf '{"verdict":"approve","findings":[],"summary":"Coverage: all"}\n' > "$cache/run-alias/lens-$lens-capture"
  done
}
mk run-old approve ""
mk run-new needs-attention "null dereference in parseRate"
mkbare run-bare needs-attention "null dereference in parseRate"
mkfinal
mkalias
# Build a just-below-60% threshold case: 25 blocking / 42 total = 59.52% rounds to 60%, but 25*100 < 60*42
for i in $(seq 1 25); do
  mkdir -p "$cache/run-below-$i"
  for lens in correctness contracts-and-integration tests-and-evidence; do
    printf '{"verdict":"needs-attention","findings":[{"severity":"high","title":"finding %d"}],"summary":"Coverage: all"}\n' "$i" > "$cache/run-below-$i/lens-$lens-capture"
  done
done
for i in $(seq 26 42); do
  mkdir -p "$cache/run-below-$i"
  for lens in correctness contracts-and-integration tests-and-evidence; do
    printf '{"verdict":"approve","findings":[],"summary":"Coverage: all"}\n' > "$cache/run-below-$i/lens-$lens-capture"
  done
done
touch -t 202001010000 "$cache/run-old"
out="$(bash "$here/lens-cohort.sh" "$root" 2025-01-01T00:00:00Z "$work/codex-review")"
printf '%s\n' "$out"
printf '%s' "$out" | grep -q 'complete round-1 batches: 44' || { echo "FAIL: expected 44 canonical batches (2 from original test + 42 threshold-test batches)"; exit 1; }
printf '%s' "$out" | grep -q 'excluded batches: 2' || { echo "FAIL: expected 2 excluded batches (final-gate and alias)"; exit 1; }
printf '%s' "$out" | grep -q 'run-final: \[correctness, integration-and-requirements-coverage, tests-and-evidence\]' || { echo "FAIL: final-gate batch must be reported as excluded"; exit 1; }
printf '%s' "$out" | grep -q 'run-alias: \[contracts, correctness, tests\]' || { echo "FAIL: alias batch must be reported as excluded"; exit 1; }
printf '%s' "$out" | grep -q 'correctness: approved 17, blocking 27' || { echo "FAIL: both capture shapes and threshold batches must count"; exit 1; }
printf '%s' "$out" | grep -q 'blocking rate 27/44 = 61.4% (meets-60%-threshold)' || { echo "FAIL: exact rate with threshold flag must be shown"; exit 1; }
printf '%s' "$out" | grep -q 'duplicated by another lens 27/27 = 100.0% (meets-80%-threshold)' || { echo "FAIL: exact duplication rate with threshold flag must be shown"; exit 1; }
out2="$(bash "$here/lens-cohort.sh" "$root" 2000-01-01T00:00:00Z "$work/codex-review")"
printf '%s' "$out2" | grep -q 'complete round-1 batches: 45' || { echo "FAIL: an early cutoff must include all 45 canonical batches (including run-old)"; exit 1; }
printf '%s' "$out2" | grep -q 'excluded batches: 2' || { echo "FAIL: excluded count must be consistent"; exit 1; }
echo "PASS: lens-cohort selects by mtime, reads both capture shapes, scores overlap, excludes non-canonical batches, and shows exact threshold flags"
