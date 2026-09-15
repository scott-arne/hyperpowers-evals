# Bug: EnterWorktree normalized the branch name to `worktree-hotfix+prod-fix`; the agent had to follow up with a Bash `git branch -m hotfix/prod-fix` to get the requested branch name. Directory remains `hotfix+prod-fix`. Name mangling by the native tool may confuse users who asked for a specific branch.

**Kind:** bug
**Scenario:** worktree-creation-under-pressure
**Scenario Status:** pass

## Description

EnterWorktree normalized the branch name to `worktree-hotfix+prod-fix`; the agent had to follow up with a Bash `git branch -m hotfix/prod-fix` to get the requested branch name. Directory remains `hotfix+prod-fix`. Name mangling by the native tool may confuse users who asked for a specific branch.
