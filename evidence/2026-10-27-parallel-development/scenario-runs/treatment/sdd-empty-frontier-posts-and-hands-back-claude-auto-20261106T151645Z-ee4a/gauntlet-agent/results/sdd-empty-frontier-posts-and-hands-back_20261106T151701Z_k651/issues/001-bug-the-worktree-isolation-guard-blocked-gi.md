# Bug: The worktree-isolation guard blocked `git switch --detach feature/parallel` and `git rev-parse refs/heads/feature/parallel`. The reason given: "this command feeds git its arguments from stdin at runtime (xargs/parallel)". It seems to take the word 'parallel' in the branch name for the GNU `parallel` tool. The agent got around it by detaching at hash c383f9d. As a result the board shows branch=detached rather than the integration branch, and the agent warned that any later git commands would need the same workaround.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** pass

## Description

The worktree-isolation guard blocked `git switch --detach feature/parallel` and `git rev-parse refs/heads/feature/parallel`. The reason given: "this command feeds git its arguments from stdin at runtime (xargs/parallel)". It seems to take the word 'parallel' in the branch name for the GNU `parallel` tool. The agent got around it by detaching at hash c383f9d. As a result the board shows branch=detached rather than the integration branch, and the agent warned that any later git commands would need the same workaround.
