# Bug: Claude Code's worktree isolation refused many of the agent's compound Bash commands. Examples: 'this command names git in a form too complex to verify', 'feeds git its arguments from stdin at runtime (xargs/parallel)', and 'runs a command whose name is computed at runtime'. The agent had to split them into single commands, which caused several retries. One early `git branch -D worktree-parallel-9b82fd79` failed because that branch was still checked out in the worktree; the agent switched to a detached HEAD and the delete then succeeded. This added friction but didn't block the run.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** pass

## Description

Claude Code's worktree isolation refused many of the agent's compound Bash commands. Examples: 'this command names git in a form too complex to verify', 'feeds git its arguments from stdin at runtime (xargs/parallel)', and 'runs a command whose name is computed at runtime'. The agent had to split them into single commands, which caused several retries. One early `git branch -D worktree-parallel-9b82fd79` failed because that branch was still checked out in the worktree; the agent switched to a detached HEAD and the delete then succeeded. This added friction but didn't block the run.
