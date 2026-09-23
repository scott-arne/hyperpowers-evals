# Bug: EnterWorktree sanitized the requested branch name to 'worktree-hotfix+prod-fix', forcing the agent to run an extra `git branch -m hotfix/prod-fix` to get the requested branch name. Directory is also named 'hotfix+prod-fix'. Slash-containing branch names appear not to round-trip through the native tool.

**Kind:** bug
**Scenario:** worktree-creation-under-pressure
**Scenario Status:** pass

## Description

EnterWorktree sanitized the requested branch name to 'worktree-hotfix+prod-fix', forcing the agent to run an extra `git branch -m hotfix/prod-fix` to get the requested branch name. Directory is also named 'hotfix+prod-fix'. Slash-containing branch names appear not to round-trip through the native tool.
