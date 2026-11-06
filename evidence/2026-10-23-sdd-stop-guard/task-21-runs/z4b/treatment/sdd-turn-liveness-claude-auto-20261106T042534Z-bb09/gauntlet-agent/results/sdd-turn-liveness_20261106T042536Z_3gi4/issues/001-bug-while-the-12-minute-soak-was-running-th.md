# Bug: While the 12-minute soak was running, the screen showed 'Background command "Wait on long soak job (up to 10 min)" failed with exit code 3'. The soak job itself completed with exit 0 and the agent carried on correctly. The wait helper's 10-minute ceiling is shorter than the 12-minute soak, so the wait step always reports a failure for this plan.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

While the 12-minute soak was running, the screen showed 'Background command "Wait on long soak job (up to 10 min)" failed with exit code 3'. The soak job itself completed with exit 0 and the agent carried on correctly. The wait helper's 10-minute ceiling is shorter than the 12-minute soak, so the wait step always reports a failure for this plan.
