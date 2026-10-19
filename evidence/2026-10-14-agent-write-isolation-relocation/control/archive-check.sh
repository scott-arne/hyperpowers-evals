#!/usr/bin/env bash
# archive-check.sh
# ../../README.md step 4 over the staged archive: every run the control's
# per-arm logs name has at least one staged session transcript, exactly one
# staged result.json and a staged verdict.json, each read where that run's
# layout keeps it; nothing under ../runs is staged as a gitlink or under a .git
# path. Reads the index, so it runs after `git add -f`. Exit 0 when all hold.
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd -P)"     # evidence/<dir>/control
ev="$(dirname "$here")"                       # evidence/<dir>
cd "$ev/../.." || exit 1
prefix="evidence/$(basename "$ev")/runs"
fail=0
staged="$(git ls-files -s -- "$prefix")"
[ -n "$staged" ] || { echo "nothing staged under $prefix"; exit 1; }
gitlinks="$(printf '%s\n' "$staged" | awk '$1 == "160000"')"
gitpaths="$(printf '%s\n' "$staged" | grep -E '(^|/)\.git(/|$)')"
echo "gitlinks: $(printf '%s' "$gitlinks" | grep -c .)"
echo ".git paths: $(printf '%s' "$gitpaths" | grep -c .)"
[ -z "$gitlinks$gitpaths" ] || fail=1
runs=0
for arm in baseline new; do
  for log in "$here/logs/$arm"/control-*-[pr][0-9]*.log; do
    [ -e "$log" ] || continue
    id="$(sed -n 's/^run-id: \([A-Za-z0-9][A-Za-z0-9._-]*\)$/\1/p' "$log")"
    record="$prefix/$arm/$id"
    if [ "$arm" = new ]; then workspace="$prefix/new/workspaces/$id"; else workspace="$record"; fi
    t="$(git ls-files -- "$workspace/home/.claude/projects" | grep -c '\.jsonl$')"
    r="$(git ls-files -- "$record/gauntlet-agent/results" | grep -c '/result\.json$')"
    v="$(git ls-files -- "$record/verdict.json" | grep -c .)"
    status=ok
    if [ "$t" -lt 1 ] || [ "$r" -ne 1 ] || [ "$v" -ne 1 ]; then status=FAIL; fail=1; fi
    echo "$status $arm $id transcripts=$t result.json=$r verdict.json=$v"
    runs=$((runs + 1))
  done
done
echo "runs checked: $runs"
exit "$fail"
