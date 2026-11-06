# Bug: Claude Code's worktree guard read 'parallel' in the branch name `feature/parallel` as a command name (the agent said GNU parallel) and blocked the plain `git switch --detach feature/parallel` several times. The agent got around it by detaching to the commit SHA c329628. The result was correct, but the guard misfires on branch names that look like commands.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** pass

## Description

Claude Code's worktree guard read 'parallel' in the branch name `feature/parallel` as a command name (the agent said GNU parallel) and blocked the plain `git switch --detach feature/parallel` several times. The agent got around it by detaching to the commit SHA c329628. The result was correct, but the guard misfires on branch names that look like commands.
