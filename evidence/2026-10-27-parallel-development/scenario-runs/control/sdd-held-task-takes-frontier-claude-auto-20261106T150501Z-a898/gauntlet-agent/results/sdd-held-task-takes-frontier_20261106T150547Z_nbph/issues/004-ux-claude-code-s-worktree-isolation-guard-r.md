# Ux: Claude Code's worktree isolation guard rejected several of the agent's compound Bash commands, including `sdd-state claim ... --session $CLAUDE_CODE_SESSION_ID; echo exit=$?`. Its message was "runs sdd-state with a value computed at runtime ... Refusing to run it". The agent had to retry these as simpler commands, which added friction.

**Kind:** ux
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** fail

## Description

Claude Code's worktree isolation guard rejected several of the agent's compound Bash commands, including `sdd-state claim ... --session $CLAUDE_CODE_SESSION_ID; echo exit=$?`. Its message was "runs sdd-state with a value computed at runtime ... Refusing to run it". The agent had to retry these as simpler commands, which added friction.
