# Ux: After the merge, the agent did not remove the worktree at .claude/worktrees/feat-ratelimit or delete the branch worktree-feat-ratelimit. It said the removal rules told it to leave that workspace alone. As a result, `git status` on main shows untracked .claude/, ratelimit/__pycache__/ and tests/__pycache__/ (there is no .gitignore).

**Kind:** ux
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

After the merge, the agent did not remove the worktree at .claude/worktrees/feat-ratelimit or delete the branch worktree-feat-ratelimit. It said the removal rules told it to leave that workspace alone. As a result, `git status` on main shows untracked .claude/, ratelimit/__pycache__/ and tests/__pycache__/ (there is no .gitignore).
