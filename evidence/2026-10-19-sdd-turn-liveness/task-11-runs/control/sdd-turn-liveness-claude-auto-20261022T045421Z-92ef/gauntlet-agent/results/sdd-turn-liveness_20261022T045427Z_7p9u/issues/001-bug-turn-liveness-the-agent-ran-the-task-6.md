# Bug: Turn liveness: the agent ran the Task 6 long soak (12 minutes) as a background shell and then ended its turn twice while it ran: 'done 10:17 PM · 1 shell still running' and 'done 10:21 PM · 1 shell still running'. Each time it needed a 'continue' from the user. This is the behaviour this story measures. The background-completion notification only arrived at about 10:28 PM, after the merge.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Turn liveness: the agent ran the Task 6 long soak (12 minutes) as a background shell and then ended its turn twice while it ran: 'done 10:17 PM · 1 shell still running' and 'done 10:21 PM · 1 shell still running'. Each time it needed a 'continue' from the user. This is the behaviour this story measures. The background-completion notification only arrived at about 10:28 PM, after the merge.
