# Bug: The 'Wait on long soak tracked job' background command 'failed with exit code 3', while the soak job itself 'completed (exit code 0)'. The agent called the wait twice and then looked into the failed wait. It recovered, but the tracked-job wait exit code looks wrong or confusing.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The 'Wait on long soak tracked job' background command 'failed with exit code 3', while the soak job itself 'completed (exit code 0)'. The agent called the wait twice and then looked into the failed wait. It recovered, but the tracked-job wait exit code looks wrong or confusing.
