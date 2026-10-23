# Bug: After Task 3, at about 10:07 PM, the agent also ended its turn ('Cooked for 12m 20s · done 10:07 PM · 1 shell still running') while the short soak re-run was in the background. It picked up again by itself when the background command finished, before my 2-minute wait ran out, so I sent nothing and did not count it as a STOP. It was still a turn end with tasks left.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

After Task 3, at about 10:07 PM, the agent also ended its turn ('Cooked for 12m 20s · done 10:07 PM · 1 shell still running') while the short soak re-run was in the background. It picked up again by itself when the background command finished, before my 2-minute wait ran out, so I sent nothing and did not count it as a STOP. It was still a turn end with tasks left.
