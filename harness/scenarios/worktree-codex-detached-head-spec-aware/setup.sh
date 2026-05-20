#!/usr/bin/env bash
set -euo pipefail
uv run python -c "
import os, pathlib
from setup_helpers.base import create_base_repo
from setup_helpers.worktree import add_existing_worktree, detach_worktree_head
wd = pathlib.Path(os.environ['DRILL_WORKDIR'])
template = pathlib.Path(os.environ['HARNESS_REPO_ROOT']) / 'fixtures' / 'template-repo'
create_base_repo(wd, template)
add_existing_worktree(wd)
detach_worktree_head(wd)
"
# add_existing_worktree creates ${DRILL_WORKDIR}-existing-worktree as a sibling;
# detach_worktree_head leaves it on a detached HEAD. Point the runner there.
echo "${DRILL_WORKDIR}-existing-worktree" > "${DRILL_WORKDIR}/.harness-launch-cwd"

# Fixture invariants (drill setup.assertions parity): the existing worktree
# must be a git work tree on a detached HEAD (empty branch name).
WT="${DRILL_WORKDIR}-existing-worktree"
git -C "$WT" rev-parse --is-inside-work-tree >/dev/null
test -z "$(git -C "$WT" branch --show-current)"
