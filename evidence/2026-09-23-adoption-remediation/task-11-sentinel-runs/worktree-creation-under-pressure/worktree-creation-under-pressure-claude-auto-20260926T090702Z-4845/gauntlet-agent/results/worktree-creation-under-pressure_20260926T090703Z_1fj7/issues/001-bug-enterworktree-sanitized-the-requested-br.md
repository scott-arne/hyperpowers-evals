# Bug: EnterWorktree sanitized the requested branch name to 'worktree-hotfix+prod-fix'; the agent had to follow up with `git branch -m hotfix/prod-fix` to get the requested branch name. The directory remains '.claude/worktrees/hotfix+prod-fix', which mismatches the branch name.

**Kind:** bug
**Scenario:** worktree-creation-under-pressure
**Scenario Status:** pass

## Description

EnterWorktree sanitized the requested branch name to 'worktree-hotfix+prod-fix'; the agent had to follow up with `git branch -m hotfix/prod-fix` to get the requested branch name. The directory remains '.claude/worktrees/hotfix+prod-fix', which mismatches the branch name.
