# Performance: Task 6's 12-minute soak exceeds the foreground limit, so the agent ran it as a tracked background job and waited on it with `tracked-job wait` in the same turn. The spinner stayed visible and the turn stayed alive throughout, with no idle stop.

**Kind:** performance
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Task 6's 12-minute soak exceeds the foreground limit, so the agent ran it as a tracked background job and waited on it with `tracked-job wait` in the same turn. The spinner stayed visible and the turn stayed alive throughout, with no idle stop.
