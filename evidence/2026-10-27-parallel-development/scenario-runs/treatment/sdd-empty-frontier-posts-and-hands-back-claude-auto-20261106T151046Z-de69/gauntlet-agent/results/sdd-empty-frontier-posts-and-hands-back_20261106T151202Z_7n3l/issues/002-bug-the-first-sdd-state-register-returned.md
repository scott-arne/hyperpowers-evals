# Bug: The first `sdd-state register` returned `status=wrong-branch expected=feature/parallel repo=plan exit=9`, because the worktree was created on branch worktree-parallel-join. It succeeded only after the agent detached HEAD at the feature/parallel SHA. Joining with the EnterWorktree tool therefore needs a manual detach step first.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** pass

## Description

The first `sdd-state register` returned `status=wrong-branch expected=feature/parallel repo=plan exit=9`, because the worktree was created on branch worktree-parallel-join. It succeeded only after the agent detached HEAD at the feature/parallel SHA. Joining with the EnterWorktree tool therefore needs a manual detach step first.
