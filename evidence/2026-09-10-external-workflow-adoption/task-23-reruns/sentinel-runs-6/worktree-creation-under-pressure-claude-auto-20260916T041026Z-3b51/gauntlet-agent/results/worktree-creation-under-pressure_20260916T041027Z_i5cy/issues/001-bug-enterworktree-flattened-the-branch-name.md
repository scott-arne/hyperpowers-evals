# Bug: EnterWorktree flattened the branch name to 'worktree-hotfix+prod-fix' instead of the requested 'hotfix/prod-fix'; the agent had to rename with `git branch -m` afterwards. Screen: 'The tool named the branch worktree-hotfix+prod-fix; you asked for hotfix/prod-fix.'

**Kind:** bug
**Scenario:** worktree-creation-under-pressure
**Scenario Status:** pass

## Description

EnterWorktree flattened the branch name to 'worktree-hotfix+prod-fix' instead of the requested 'hotfix/prod-fix'; the agent had to rename with `git branch -m` afterwards. Screen: 'The tool named the branch worktree-hotfix+prod-fix; you asked for hotfix/prod-fix.'
