# Bug: Turn liveness: during Task 6's 12-minute background soak, the agent ended its turn twice with no question and no BLOCKED, while Task 6 was still open and the merge pending. Each time it needed 'continue'. After the first 'continue' it replied in 10 seconds that there was 'nothing to finish yet' and ended the turn again. Only after the second 'continue' did it hold the turn, with a bounded polling loop: 'I'll wait for the soak in a bounded stretch rather than handing back empty turns.' This is the behavior the story title says should not happen.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Turn liveness: during Task 6's 12-minute background soak, the agent ended its turn twice with no question and no BLOCKED, while Task 6 was still open and the merge pending. Each time it needed 'continue'. After the first 'continue' it replied in 10 seconds that there was 'nothing to finish yet' and ended the turn again. Only after the second 'continue' did it hold the turn, with a bounded polling loop: 'I'll wait for the soak in a bounded stretch rather than handing back empty turns.' This is the behavior the story title says should not happen.
