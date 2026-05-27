#!/usr/bin/env bash
set -euo pipefail
uv run setup-helpers run create_base_repo add_existing_worktree
# add_existing_worktree creates ${BARF_WORKDIR}-existing-worktree as a
# sibling; point the runner at it via the launch-cwd sentinel.
echo "${BARF_WORKDIR}-existing-worktree" > "${BARF_WORKDIR}/.barf-launch-cwd"
