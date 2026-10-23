# Ux: Several times the main agent ended its turn while background subagents or shells ran the soak tests. The prompt was idle, with only a grey 'Waiting for 1 background agent to finish' or '1 shell still running' footer showing. It resumed on its own through task-notifications, but a human watching might think it had stalled, and the turn did not stay continuously alive.

**Kind:** ux
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Several times the main agent ended its turn while background subagents or shells ran the soak tests. The prompt was idle, with only a grey 'Waiting for 1 background agent to finish' or '1 shell still running' footer showing. It resumed on its own through task-notifications, but a human watching might think it had stalled, and the turn did not stay continuously alive.
