#!/usr/bin/env bash
# The corpus replay of record. Invoke as `bash <this file>` from anywhere.
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd -P)"            # evidence/<dir>/replay
repo="$(cd "$here/../../.." && pwd -P)"              # the worktree
# results/ is gitignored: the retained corpus lives in the primary checkout, which
# `--git-common-dir` names (relative for the primary checkout, absolute for a worktree).
common="$(git -C "$repo" rev-parse --git-common-dir)"
case "$common" in /*) ;; *) common="$repo/$common" ;; esac
corpus="$(cd "$common/.." && pwd -P)/results"
test -d "$corpus/worktree-no-drift-to-main-claude-auto-20261003T112456Z-f670" || { echo "corpus root wrong: $corpus" >&2; exit 2; }
cd "$repo"
bash scripts/replay-post-checks --results "$corpus" --scenarios "$repo/scenarios" --report "$here" \
  --synthetic test/fixtures/replay-synthetic/tdd-history-json \
  --synthetic test/fixtures/replay-synthetic/migrated-grep-shape \
  --synthetic test/fixtures/replay-synthetic/tool-npx \
  --synthetic test/fixtures/replay-synthetic/tool-python3 \
  --synthetic test/fixtures/replay-synthetic/tool-go \
  --synthetic test/fixtures/replay-synthetic/plan-gate-locked-grep \
  --synthetic test/fixtures/replay-synthetic/stale-broker-ungated-grep \
  --synthetic test/fixtures/replay-synthetic/codex-stub-installpath \
  --synthetic test/fixtures/replay-synthetic/codex-stub-companion \
  --synthetic test/fixtures/replay-synthetic/codex-broker-state-dir \
  --synthetic test/fixtures/replay-synthetic/codex-broker-state-file 2>&1 | tee "$here/stdout.txt"
rc=${PIPESTATUS[0]}
echo "replay exit: $rc (corpus: $corpus)" | tee -a "$here/stdout.txt"
exit "$rc"
