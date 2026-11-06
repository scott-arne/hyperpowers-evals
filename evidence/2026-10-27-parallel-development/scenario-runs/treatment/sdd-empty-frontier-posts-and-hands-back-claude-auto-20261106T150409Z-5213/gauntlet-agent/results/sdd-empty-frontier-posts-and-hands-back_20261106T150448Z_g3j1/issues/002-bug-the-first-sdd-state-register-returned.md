# Bug: The first `sdd-state register` returned `status=wrong-branch expected=feature/parallel repo=plan exit=9`, because EnterWorktree had put the worktree on branch worktree-parallel-48ce6a84. Registration only succeeded after the agent detached at the integration commit. The worktree tool and the SDD state expectations don't line up out of the box.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** pass

## Description

The first `sdd-state register` returned `status=wrong-branch expected=feature/parallel repo=plan exit=9`, because EnterWorktree had put the worktree on branch worktree-parallel-48ce6a84. Registration only succeeded after the agent detached at the integration commit. The worktree tool and the SDD state expectations don't line up out of the box.
