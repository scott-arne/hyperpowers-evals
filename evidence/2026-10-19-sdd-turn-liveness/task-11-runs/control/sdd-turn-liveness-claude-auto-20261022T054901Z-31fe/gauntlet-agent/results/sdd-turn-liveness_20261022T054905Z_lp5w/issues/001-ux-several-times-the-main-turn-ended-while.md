# Ux: Several times the main turn ended while a background subagent or soak-test shell was still running. Examples: 'Task 3's implementer is running, soak test included. I'll pick up again when it reports.', 'Task 4's brief is ready. I'll dispatch it after the Task 3 soak test confirms.' ('1 shell still running'), and 'My re-run of the long soak test (about 12 minutes) is still in progress.' The prompt looked idle, with only a background-agent row or '1 shell' in the footer. Each time a task-notification resumed the agent with no user input. This works, but a user could easily read it as stopped.

**Kind:** ux
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Several times the main turn ended while a background subagent or soak-test shell was still running. Examples: 'Task 3's implementer is running, soak test included. I'll pick up again when it reports.', 'Task 4's brief is ready. I'll dispatch it after the Task 3 soak test confirms.' ('1 shell still running'), and 'My re-run of the long soak test (about 12 minutes) is still in progress.' The prompt looked idle, with only a background-agent row or '1 shell' in the footer. Each time a task-notification resumed the agent with no user input. This works, but a user could easily read it as stopped.
