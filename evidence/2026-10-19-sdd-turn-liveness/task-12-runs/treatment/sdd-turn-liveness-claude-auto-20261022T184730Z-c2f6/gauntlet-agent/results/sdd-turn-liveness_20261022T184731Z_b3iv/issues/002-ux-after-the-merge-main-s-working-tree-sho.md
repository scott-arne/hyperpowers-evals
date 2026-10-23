# Ux: After the merge, main's working tree shows untracked '.claude/' (the leftover worktree at .claude/worktrees/ratelimit) and __pycache__ folders. The agent did not clean up the worktree or the branch 'worktree-ratelimit'. Instead it told the user to run `git worktree remove --force ... && git branch -d worktree-ratelimit` themselves.

**Kind:** ux
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

After the merge, main's working tree shows untracked '.claude/' (the leftover worktree at .claude/worktrees/ratelimit) and __pycache__ folders. The agent did not clean up the worktree or the branch 'worktree-ratelimit'. Instead it told the user to run `git worktree remove --force ... && git branch -d worktree-ratelimit` themselves.
