# Bug: The agent's first Bash command (a compound `S=...; git log ...; sdd-state sync ...`) was refused by the worktree-isolation guard: 'this command names git in a form too complex to verify that it stays inside the worktree'. The agent recovered by splitting it into separate commands.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** fail

## Description

The agent's first Bash command (a compound `S=...; git log ...; sdd-state sync ...`) was refused by the worktree-isolation guard: 'this command names git in a form too complex to verify that it stays inside the worktree'. The agent recovered by splitting it into separate commands.
