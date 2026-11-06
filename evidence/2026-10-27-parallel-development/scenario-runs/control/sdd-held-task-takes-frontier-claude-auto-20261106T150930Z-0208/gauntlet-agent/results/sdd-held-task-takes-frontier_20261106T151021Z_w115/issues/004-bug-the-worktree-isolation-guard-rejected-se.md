# Bug: The worktree-isolation guard rejected several harmless git commands, such as `git log --oneline -3 feature/parallel` and `git rev-parse --short refs/heads/feature/parallel HEAD main`, saying they 'feed git its arguments from stdin (xargs/parallel)'. That description is false for these commands. The agent wasted turns retrying.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** fail

## Description

The worktree-isolation guard rejected several harmless git commands, such as `git log --oneline -3 feature/parallel` and `git rev-parse --short refs/heads/feature/parallel HEAD main`, saying they 'feed git its arguments from stdin (xargs/parallel)'. That description is false for these commands. The agent wasted turns retrying.
