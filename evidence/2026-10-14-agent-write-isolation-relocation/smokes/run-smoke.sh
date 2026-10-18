#!/usr/bin/env bash
# One live smoke of record: `bash <this file> <agent>`.
set -uo pipefail
agent="$1"
here="$(cd "$(dirname "$0")" && pwd -P)"            # evidence/<dir>/smokes
repo="$(cd "$here/../../.." && pwd -P)"              # the worktree
out="$here/$agent"; mkdir -p "$out"
cd "$repo"
bun run quorum run scenarios/00-quorum-smoke-hello-world --coding-agent "$agent" 2>&1 | tee "$out/stdout.txt"
run_rc=${PIPESTATUS[0]}; echo "run exit: $run_rc" | tee -a "$out/stdout.txt"
run_id="$(sed -n 's/^run-id: //p' "$out/stdout.txt" | tail -1)"
bun run quorum show "results/$run_id" 2>&1 | tee "$out/show.txt"
show_rc=${PIPESTATUS[0]}; echo "show exit: $show_rc" | tee -a "$out/show.txt"
echo "$agent: run exit $run_rc, show exit $show_rc, run-id $run_id"
