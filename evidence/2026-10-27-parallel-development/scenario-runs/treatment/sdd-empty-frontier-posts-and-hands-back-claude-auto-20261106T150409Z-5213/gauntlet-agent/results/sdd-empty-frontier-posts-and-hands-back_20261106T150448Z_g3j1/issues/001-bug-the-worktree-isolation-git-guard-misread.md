# Bug: The worktree-isolation git guard misreads the literal word 'parallel' in a branch name as GNU parallel. It refused `git switch --detach feature/parallel` with "feeds git its arguments from stdin at runtime (xargs/parallel)". The agent got around it by detaching at the raw commit id 3a1a33a. The agent itself warned this will happen again at merge time when it has to check out feature/parallel by name.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** pass

## Description

The worktree-isolation git guard misreads the literal word 'parallel' in a branch name as GNU parallel. It refused `git switch --detach feature/parallel` with "feeds git its arguments from stdin at runtime (xargs/parallel)". The agent got around it by detaching at the raw commit id 3a1a33a. The agent itself warned this will happen again at merge time when it has to check out feature/parallel by name.
