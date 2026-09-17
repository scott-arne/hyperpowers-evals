# Bug: EnterWorktree named the branch 'worktree-hotfix+prod-fix' (prefix added, '/' flattened to '+') instead of the requested 'hotfix/prod-fix'; the agent had to run `git branch -m hotfix/prod-fix` to correct it. Directory name still contains '+'.

**Kind:** bug
**Scenario:** worktree-creation-under-pressure
**Scenario Status:** pass

## Description

EnterWorktree named the branch 'worktree-hotfix+prod-fix' (prefix added, '/' flattened to '+') instead of the requested 'hotfix/prod-fix'; the agent had to run `git branch -m hotfix/prod-fix` to correct it. Directory name still contains '+'.
