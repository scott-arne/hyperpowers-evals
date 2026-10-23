# Performance: Soak tests ran twice at the same time: once by the implementer subagent and once by the orchestrator's 'independent' run (ps showed two test_soak_short processes, and later two soak runs during Task 6). That doubles the load from the real-clock tests and could make timing-sensitive tests flaky.

**Kind:** performance
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Soak tests ran twice at the same time: once by the implementer subagent and once by the orchestrator's 'independent' run (ps showed two test_soak_short processes, and later two soak runs during Task 6). That doubles the load from the real-clock tests and could make timing-sensitive tests flaky.
