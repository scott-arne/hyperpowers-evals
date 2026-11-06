# Bug: The first tracked-job wait on the 12-minute soak hit the shell timeout, was moved to the background, and then reported 'failed with exit code 3'. The agent recovered by waiting again with a shorter bound. The job-wait bound doesn't fit the shell timeout.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The first tracked-job wait on the 12-minute soak hit the shell timeout, was moved to the background, and then reported 'failed with exit code 3'. The agent recovered by waiting again with a shorter bound. The job-wait bound doesn't fit the shell timeout.
