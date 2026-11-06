# Bug: The worktree guard blocked the agent's first claim command, which used $CLAUDE_CODE_SESSION_ID inside a compound command, with the message 'construct too complex to verify... Refusing to run it'. The agent had to retry with the session ID written out.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** fail

## Description

The worktree guard blocked the agent's first claim command, which used $CLAUDE_CODE_SESSION_ID inside a compound command, with the message 'construct too complex to verify... Refusing to run it'. The agent had to retry with the session ID written out.
