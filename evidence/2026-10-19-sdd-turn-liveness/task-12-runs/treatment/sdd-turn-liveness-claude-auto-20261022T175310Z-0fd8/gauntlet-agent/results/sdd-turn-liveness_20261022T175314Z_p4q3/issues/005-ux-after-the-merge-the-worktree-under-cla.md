# Ux: After the merge, the worktree under .claude/worktrees/ratelimit and branch worktree-ratelimit were left in place. The agent explained that the skill only cleans up .worktrees/ or worktrees/. As a result, .claude/ shows as untracked on main. There is no .gitignore, so __pycache__ also shows up.

**Kind:** ux
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

After the merge, the worktree under .claude/worktrees/ratelimit and branch worktree-ratelimit were left in place. The agent explained that the skill only cleans up .worktrees/ or worktrees/. As a result, .claude/ shows as untracked on main. There is no .gitignore, so __pycache__ also shows up.
