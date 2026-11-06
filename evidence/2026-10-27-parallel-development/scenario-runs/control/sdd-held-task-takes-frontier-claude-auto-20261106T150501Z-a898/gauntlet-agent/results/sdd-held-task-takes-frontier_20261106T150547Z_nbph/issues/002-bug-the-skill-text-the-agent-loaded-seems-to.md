# Bug: The skill text the agent loaded seems to support stopping. The agent quoted guidance that skipping ahead to another task "would decide it by accident" and that it should "Tell your human partner who holds the task and since when, and ask whether to take it over". This conflicts with the intended rule (take the claimable task and don't stop on the held one), so the skill wording may be the root cause.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** fail

## Description

The skill text the agent loaded seems to support stopping. The agent quoted guidance that skipping ahead to another task "would decide it by accident" and that it should "Tell your human partner who holds the task and since when, and ask whether to take it over". This conflicts with the intended rule (take the claimable task and don't stop on the held one), so the skill wording may be the root cause.
