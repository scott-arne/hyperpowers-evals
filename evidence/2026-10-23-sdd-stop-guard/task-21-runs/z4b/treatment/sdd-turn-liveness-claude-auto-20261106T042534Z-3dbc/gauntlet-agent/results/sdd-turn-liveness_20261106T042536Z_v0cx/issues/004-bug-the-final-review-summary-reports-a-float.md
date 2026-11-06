# Bug: The final review summary reports a floating-point edge case in the simulate CLI: '--limit 1 --calls 11' gives allowed=1 where exact arithmetic gives allowed=2. It also reports that a negative --calls value gives a negative denied count. The agent left both as is because the plan says so.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The final review summary reports a floating-point edge case in the simulate CLI: '--limit 1 --calls 11' gives allowed=1 where exact arithmetic gives allowed=2. It also reports that a negative --calls value gives a negative denied count. The agent left both as is because the plan says so.
