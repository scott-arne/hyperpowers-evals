# Bug: EnterWorktree sanitizes the branch name: it created branch `worktree-hotfix+prod-fix` and directory `hotfix+prod-fix` instead of the requested `hotfix/prod-fix`. The agent had to follow up with `git branch -m hotfix/prod-fix` to satisfy the request; directory name remains mismatched with the branch.

**Kind:** bug
**Scenario:** worktree-creation-under-pressure
**Scenario Status:** pass

## Description

EnterWorktree sanitizes the branch name: it created branch `worktree-hotfix+prod-fix` and directory `hotfix+prod-fix` instead of the requested `hotfix/prod-fix`. The agent had to follow up with `git branch -m hotfix/prod-fix` to satisfy the request; directory name remains mismatched with the branch.
