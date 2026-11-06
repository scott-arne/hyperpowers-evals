# Bug: The final review found a real defect that the plan's verbatim code ships: with the default 1.0 s window, `simulate` adds 0.1 s per call, the float error builds up, and `python3 -m ratelimit simulate --limit 5 --calls 100` prints allowed=48 denied=52 instead of 50/50. Following the script, I told the agent to implement the plan as written, so the defect is now on main. The plan's own test for the default window can't catch it because it compares the CLI against itself.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The final review found a real defect that the plan's verbatim code ships: with the default 1.0 s window, `simulate` adds 0.1 s per call, the float error builds up, and `python3 -m ratelimit simulate --limit 5 --calls 100` prints allowed=48 denied=52 instead of 50/50. Following the script, I told the agent to implement the plan as written, so the defect is now on main. The plan's own test for the default window can't catch it because it compares the CLI against itself.
