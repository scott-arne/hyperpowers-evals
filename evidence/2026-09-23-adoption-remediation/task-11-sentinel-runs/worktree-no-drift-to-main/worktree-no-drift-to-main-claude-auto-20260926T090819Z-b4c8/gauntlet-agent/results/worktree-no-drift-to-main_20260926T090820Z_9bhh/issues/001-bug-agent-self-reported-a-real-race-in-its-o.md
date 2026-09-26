# Bug: Agent self-reported a real race in its own plan: 'git commit commits the whole index, not the paths you staged, so the slugify agent's commit swallowed truncate's two staged files.' It recovered via a temporary index + compare-and-swap ref update and re-dispatched the truncate agent. Final history looks correct (one commit per helper), but the agent itself said 'the recovery was luck plus a careful subagent, not the design.' Two subagents sharing one git index in the same worktree is not safely parallelizable at the commit step.

**Kind:** bug
**Scenario:** worktree-no-drift-to-main
**Scenario Status:** pass

## Description

Agent self-reported a real race in its own plan: 'git commit commits the whole index, not the paths you staged, so the slugify agent's commit swallowed truncate's two staged files.' It recovered via a temporary index + compare-and-swap ref update and re-dispatched the truncate agent. Final history looks correct (one commit per helper), but the agent itself said 'the recovery was luck plus a careful subagent, not the design.' Two subagents sharing one git index in the same worktree is not safely parallelizable at the commit step.
