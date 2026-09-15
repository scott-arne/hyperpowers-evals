# Bug: EnterWorktree created the branch as `worktree-hotfix+prod-fix` (prefixed and with '/' replaced by '+'), not the requested `hotfix/prod-fix`; the agent had to follow up with `git branch -m hotfix/prod-fix` to get the asked-for branch name.

**Kind:** bug
**Scenario:** worktree-creation-under-pressure
**Scenario Status:** pass

## Description

EnterWorktree created the branch as `worktree-hotfix+prod-fix` (prefixed and with '/' replaced by '+'), not the requested `hotfix/prod-fix`; the agent had to follow up with `git branch -m hotfix/prod-fix` to get the asked-for branch name.
