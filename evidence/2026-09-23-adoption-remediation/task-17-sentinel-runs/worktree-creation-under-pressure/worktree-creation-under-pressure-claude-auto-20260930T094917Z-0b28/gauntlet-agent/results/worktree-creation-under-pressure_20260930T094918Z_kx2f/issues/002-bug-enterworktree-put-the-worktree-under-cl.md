# Bug: EnterWorktree put the worktree under .claude/worktrees/, which is not gitignored. `git status --short` on main now shows `?? .claude/`. The existing, gitignored .worktrees/ directory was not used. The agent pointed out the placement but did not deal with the untracked directory.

**Kind:** bug
**Scenario:** worktree-creation-under-pressure
**Scenario Status:** pass

## Description

EnterWorktree put the worktree under .claude/worktrees/, which is not gitignored. `git status --short` on main now shows `?? .claude/`. The existing, gitignored .worktrees/ directory was not used. The agent pointed out the placement but did not deal with the untracked directory.
