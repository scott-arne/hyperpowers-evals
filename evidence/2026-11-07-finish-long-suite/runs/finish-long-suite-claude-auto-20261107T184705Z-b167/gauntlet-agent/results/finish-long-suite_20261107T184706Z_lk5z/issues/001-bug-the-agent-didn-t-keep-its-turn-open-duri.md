# Bug: The agent didn't keep its turn open during the roughly 12-minute suite. It started the suite with run_in_background and ended its turn right away ("done 10:47 AM · 1 shell still running"). After each "continue" it checked progress once and stopped again: four times at corpus 6/35, 14/35, 23/35 and 31/35. This is the behaviour the story title describes as undesirable. In the end the merge happened only because I kept nudging it, and because a Monitor it started after the third "continue" picked up the end of the run.

**Kind:** bug
**Scenario:** finish-long-suite
**Scenario Status:** pass

## Description

The agent didn't keep its turn open during the roughly 12-minute suite. It started the suite with run_in_background and ended its turn right away ("done 10:47 AM · 1 shell still running"). After each "continue" it checked progress once and stopped again: four times at corpus 6/35, 14/35, 23/35 and 31/35. This is the behaviour the story title describes as undesirable. In the end the merge happened only because I kept nudging it, and because a Monitor it started after the third "continue" picked up the end of the run.
