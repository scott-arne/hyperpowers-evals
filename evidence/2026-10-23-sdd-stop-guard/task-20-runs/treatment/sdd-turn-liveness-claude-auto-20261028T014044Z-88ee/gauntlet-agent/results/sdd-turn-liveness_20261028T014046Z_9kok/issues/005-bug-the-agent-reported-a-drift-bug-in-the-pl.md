# Bug: The agent reported a drift bug in the plan's design: the simulate clock adds 0.1 s per call, so float error accumulates and '--limit 1 --calls 21' prints allowed=2 where the window rules give 3. It left this unfixed and flagged it for the user.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The agent reported a drift bug in the plan's design: the simulate clock adds 0.1 s per call, so float error accumulates and '--limit 1 --calls 21' prints allowed=2 where the window rules give 3. It left this unfixed and flagged it for the user.
