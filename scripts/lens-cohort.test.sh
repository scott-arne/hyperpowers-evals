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
mk run-old approve ""
mk run-new needs-attention "null dereference in parseRate"
mkbare run-bare needs-attention "null dereference in parseRate"
touch -t 202001010000 "$cache/run-old"
out="$(bash "$here/lens-cohort.sh" "$root" 2025-01-01T00:00:00Z "$work/codex-review")"
printf '%s\n' "$out"
printf '%s' "$out" | grep -q 'complete round-1 batches: 2' || { echo "FAIL: expected exactly the two new batches (envelope and bare payload)"; exit 1; }
printf '%s' "$out" | grep -q 'correctness: approved 0, blocking 2' || { echo "FAIL: both capture shapes must count as blocking"; exit 1; }
printf '%s' "$out" | grep -q 'duplicated by another lens 100%' || { echo "FAIL: identical titles across lenses should read as duplicated"; exit 1; }
out2="$(bash "$here/lens-cohort.sh" "$root" 2000-01-01T00:00:00Z "$work/codex-review")"
printf '%s' "$out2" | grep -q 'complete round-1 batches: 3' || { echo "FAIL: an early cutoff must include all three batches"; exit 1; }
echo "PASS: lens-cohort selects by mtime, reads both capture shapes, and scores overlap"
