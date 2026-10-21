# Ux: Several times the main agent's turn ended with only a background subagent running (e.g. 'The Task 3 implementer is running in the background, including the roughly 4-minute short soak'). The prompt was idle and there was no main spinner, only a background-agent status row. It resumed by itself on the task-notification each time, but a human could easily read these moments as stalls.

**Kind:** ux
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Several times the main agent's turn ended with only a background subagent running (e.g. 'The Task 3 implementer is running in the background, including the roughly 4-minute short soak'). The prompt was idle and there was no main spinner, only a background-agent status row. It resumed by itself on the task-notification each time, but a human could easily read these moments as stalls.
