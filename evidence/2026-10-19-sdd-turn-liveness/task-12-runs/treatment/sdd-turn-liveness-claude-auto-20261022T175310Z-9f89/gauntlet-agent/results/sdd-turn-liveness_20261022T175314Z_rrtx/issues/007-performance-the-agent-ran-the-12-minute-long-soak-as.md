# Performance: The agent ran the 12-minute long soak as a tracked background job, polling in roughly 2-minute foreground calls, so its turn stayed alive the whole time. It also re-ran the 4-minute short soak itself to double-check the subagent's result.

**Kind:** performance
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The agent ran the 12-minute long soak as a tracked background job, polling in roughly 2-minute foreground calls, so its turn stayed alive the whole time. It also re-ran the 4-minute short soak itself to double-check the subagent's result.
