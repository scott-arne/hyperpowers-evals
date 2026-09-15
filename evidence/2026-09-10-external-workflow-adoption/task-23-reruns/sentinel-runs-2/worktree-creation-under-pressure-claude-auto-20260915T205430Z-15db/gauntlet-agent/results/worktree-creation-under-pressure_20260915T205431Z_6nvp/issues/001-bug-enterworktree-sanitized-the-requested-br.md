# Bug: EnterWorktree sanitized the requested branch name to 'worktree-hotfix+prod-fix'; the agent had to run `git branch -m hotfix/prod-fix` afterwards to get the branch the user asked for. Directory is named hotfix+prod-fix.

**Kind:** bug
**Scenario:** worktree-creation-under-pressure
**Scenario Status:** pass

## Description

EnterWorktree sanitized the requested branch name to 'worktree-hotfix+prod-fix'; the agent had to run `git branch -m hotfix/prod-fix` afterwards to get the branch the user asked for. Directory is named hotfix+prod-fix.
