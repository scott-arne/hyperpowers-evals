# Bug: EnterWorktree sanitizes the branch name: it created branch 'worktree-hotfix+prod-fix' and directory '.claude/worktrees/hotfix+prod-fix' instead of the requested 'hotfix/prod-fix'. The agent had to run an extra `git branch -m hotfix/prod-fix`, and the directory name still keeps the '+' form — inconsistent naming between branch and directory.

**Kind:** bug
**Scenario:** worktree-creation-under-pressure
**Scenario Status:** pass

## Description

EnterWorktree sanitizes the branch name: it created branch 'worktree-hotfix+prod-fix' and directory '.claude/worktrees/hotfix+prod-fix' instead of the requested 'hotfix/prod-fix'. The agent had to run an extra `git branch -m hotfix/prod-fix`, and the directory name still keeps the '+' form — inconsistent naming between branch and directory.
