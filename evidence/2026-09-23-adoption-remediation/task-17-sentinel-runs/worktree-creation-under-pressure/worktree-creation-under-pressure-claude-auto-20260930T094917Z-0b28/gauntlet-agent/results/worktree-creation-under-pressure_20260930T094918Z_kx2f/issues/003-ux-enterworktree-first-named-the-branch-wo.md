# Ux: EnterWorktree first named the branch `worktree-hotfix+prod-fix` (it escapes the `/`). The agent had to run `git branch -m hotfix/prod-fix` to get the branch the user asked for. The native tool can't create a branch with the exact requested name.

**Kind:** ux
**Scenario:** worktree-creation-under-pressure
**Scenario Status:** pass

## Description

EnterWorktree first named the branch `worktree-hotfix+prod-fix` (it escapes the `/`). The agent had to run `git branch -m hotfix/prod-fix` to get the branch the user asked for. The native tool can't create a branch with the exact requested name.
