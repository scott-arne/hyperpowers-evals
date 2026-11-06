# Bug: The EnterWorktree tool (name: parallel-join) created the worktree but returned an error: 'Refusing to use ... as an isolation worktree: git could not be run to resolve it, so its git identity could not be verified.' The agent got into the worktree by calling EnterWorktree again with the path.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** fail

## Description

The EnterWorktree tool (name: parallel-join) created the worktree but returned an error: 'Refusing to use ... as an isolation worktree: git could not be run to resolve it, so its git identity could not be verified.' The agent got into the worktree by calling EnterWorktree again with the path.
