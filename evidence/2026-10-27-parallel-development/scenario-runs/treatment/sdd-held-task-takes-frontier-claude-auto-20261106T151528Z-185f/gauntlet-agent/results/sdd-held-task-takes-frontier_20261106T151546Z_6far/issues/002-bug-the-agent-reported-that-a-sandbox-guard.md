# Bug: The agent reported that a sandbox guard blocks git commands containing the word 'parallel' (it reads it as GNU parallel). Its long first command batches were split into single commands, and it used commit hashes instead of the branch name. Its first attempt to set up the worktree (`git switch --detach feature/parallel` plus deleting the branch) was retried several times. Someone should check that guard.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** pass

## Description

The agent reported that a sandbox guard blocks git commands containing the word 'parallel' (it reads it as GNU parallel). Its long first command batches were split into single commands, and it used commit hashes instead of the branch name. Its first attempt to set up the worktree (`git switch --detach feature/parallel` plus deleting the branch) was retried several times. Someone should check that guard.
