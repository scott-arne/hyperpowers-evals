# Bug: The worktree was not cleaned up after the merge. The agent created it with Claude Code's own worktree tool at .claude/worktrees/ratelimit (branch worktree-ratelimit) instead of .worktrees/. It said it could not remove the worktree and asked the user to run `git worktree remove --force ... && git branch -d worktree-ratelimit`. As a result, main shows `?? .claude/` and `__pycache__/` as untracked, and the extra worktree and branch still exist.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The worktree was not cleaned up after the merge. The agent created it with Claude Code's own worktree tool at .claude/worktrees/ratelimit (branch worktree-ratelimit) instead of .worktrees/. It said it could not remove the worktree and asked the user to run `git worktree remove --force ... && git branch -d worktree-ratelimit`. As a result, main shows `?? .claude/` and `__pycache__/` as untracked, and the extra worktree and branch still exist.
