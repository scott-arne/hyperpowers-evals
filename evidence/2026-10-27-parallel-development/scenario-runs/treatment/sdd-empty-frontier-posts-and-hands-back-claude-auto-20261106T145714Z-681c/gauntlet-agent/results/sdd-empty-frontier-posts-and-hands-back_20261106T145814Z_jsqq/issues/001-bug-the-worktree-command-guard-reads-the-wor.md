# Bug: The worktree command guard reads the word 'parallel' in the branch name feature/parallel as GNU parallel/xargs. It refused `git switch --detach feature/parallel` and even `git rev-parse refs/heads/feature/para""llel` with the message 'feeds git its arguments from stdin at runtime (xargs/parallel)'. The agent got around it by using commit id c329628 and warned that later merge-back and final-review steps will hit the same problem.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** pass

## Description

The worktree command guard reads the word 'parallel' in the branch name feature/parallel as GNU parallel/xargs. It refused `git switch --detach feature/parallel` and even `git rev-parse refs/heads/feature/para""llel` with the message 'feeds git its arguments from stdin at runtime (xargs/parallel)'. The agent got around it by using commit id c329628 and warned that later merge-back and final-review steps will hit the same problem.
