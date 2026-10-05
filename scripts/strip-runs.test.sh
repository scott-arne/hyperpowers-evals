#!/usr/bin/env bash
# Proves strip-runs deletes the regenerable caches a run's throwaway $HOME
# collects, the uv cache among them, and leaves the SDD scratch cache beside
# it and the run's evidence alone.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
work="$(mktemp -d "${TMPDIR:-/tmp}/strip-runs-test.XXXXXX")"
trap 'rm -rf "$work"' EXIT
run="$work/results/scenario-claude-auto-20260101T000000Z-abcd"
mkdir -p "$run/home/.cache/uv/archive-v0" "$run/home/.cache/hyperpowers/sdd" \
  "$run/home/.npm/_cacache" "$run/coding-agent-workdir"
printf 'wheel\n' > "$run/home/.cache/uv/archive-v0/pkg.whl"
printf 'npm\n' > "$run/home/.npm/_cacache/index"
printf '# SDD ledger\n' > "$run/home/.cache/hyperpowers/sdd/progress.md"
printf '{}\n' > "$run/trajectory.json"
printf 'fixture\n' > "$run/coding-agent-workdir/README.md"
# strip-runs leaves runs touched within the last hour alone.
touch -t 202001010000 "$run"
bash "$here/strip-runs" --results-root "$work/results" > "$work/out.txt"
cat "$work/out.txt"
fail() { echo "FAIL: $1"; exit 1; }
[ ! -e "$run/home/.cache/uv" ] || fail "home/.cache/uv must be removed"
[ ! -e "$run/home/.npm/_cacache" ] || fail "home/.npm/_cacache must be removed"
[ -f "$run/home/.cache/hyperpowers/sdd/progress.md" ] || fail "home/.cache/hyperpowers is evidence and must survive"
[ -f "$run/trajectory.json" ] || fail "trajectory.json must survive"
[ -f "$run/coding-agent-workdir/README.md" ] || fail "coding-agent-workdir must survive"
echo "PASS: strip-runs removes the uv and npm caches and keeps the SDD cache and the run's evidence"
