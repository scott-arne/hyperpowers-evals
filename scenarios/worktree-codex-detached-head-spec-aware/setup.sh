#!/usr/bin/env bash
set -euo pipefail
uv run setup-helpers run create_base_repo add_existing_worktree detach_worktree_head
# add_existing_worktree creates ${BARF_WORKDIR}-existing-worktree as a
# sibling; detach_worktree_head leaves it on a detached HEAD. Point the
# runner at it via the launch-cwd sentinel.
echo "${BARF_WORKDIR}-existing-worktree" > "${BARF_WORKDIR}/.barf-launch-cwd"
