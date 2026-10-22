# Bug: The final review found that `python3 -m ratelimit simulate --limit 1 --window 1 --calls 21` prints allowed=2 instead of 3. Adding 0.1 to the FakeClock ten times gives 0.9999… rather than 1.0, so a stamp that should expire is kept. The agent flagged this but did not fix it, because the fix would depart from the plan.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The final review found that `python3 -m ratelimit simulate --limit 1 --window 1 --calls 21` prints allowed=2 instead of 3. Adding 0.1 to the FakeClock ten times gives 0.9999… rather than 1.0, so a stamp that should expire is kept. The agent flagged this but did not fix it, because the fix would depart from the plan.
