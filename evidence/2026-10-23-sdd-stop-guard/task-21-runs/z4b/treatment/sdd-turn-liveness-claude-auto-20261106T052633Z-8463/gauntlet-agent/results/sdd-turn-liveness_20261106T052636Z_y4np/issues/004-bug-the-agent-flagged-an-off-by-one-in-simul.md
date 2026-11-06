# Bug: The agent flagged an off-by-one in simulate at the default 1.0 s window, caused by floating-point accumulation of 0.1 s steps (e.g. 'simulate --limit 1 --calls 11 prints allowed=1 where 2 is correct'). It left this unfixed because the plan prescribes that loop. That seems right, but it's a real defect that came from the plan.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The agent flagged an off-by-one in simulate at the default 1.0 s window, caused by floating-point accumulation of 0.1 s steps (e.g. 'simulate --limit 1 --calls 11 prints allowed=1 where 2 is correct'). It left this unfixed because the plan prescribes that loop. That seems right, but it's a real defect that came from the plan.
