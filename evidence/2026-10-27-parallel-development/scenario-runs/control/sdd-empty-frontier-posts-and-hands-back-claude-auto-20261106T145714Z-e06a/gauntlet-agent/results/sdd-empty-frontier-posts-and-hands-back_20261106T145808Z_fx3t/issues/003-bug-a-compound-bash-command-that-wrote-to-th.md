# Bug: A compound Bash command that wrote to the ledger was refused with a message saying it was 'a construct too complex to verify... a worktree-isolated session's git operations must target its own worktree'. The agent had to split it into separate commands.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** fail

## Description

A compound Bash command that wrote to the ledger was refused with a message saying it was 'a construct too complex to verify... a worktree-isolated session's git operations must target its own worktree'. The agent had to split it into separate commands.
