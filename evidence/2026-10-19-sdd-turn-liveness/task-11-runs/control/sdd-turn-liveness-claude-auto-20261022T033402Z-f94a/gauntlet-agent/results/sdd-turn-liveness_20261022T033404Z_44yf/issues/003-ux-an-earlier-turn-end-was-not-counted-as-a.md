# Ux: An earlier turn end was not counted as a STOP. During the Task 3 short-soak re-run the agent also ended its turn ('The soak should finish in about 3 minutes. Nothing else can usefully run until it does.', 'Cogitated for 11m 29s · done 8:46 PM'). The background-command completion resumed it before the 2-minute wait ran out, so I never replied.

**Kind:** ux
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

An earlier turn end was not counted as a STOP. During the Task 3 short-soak re-run the agent also ended its turn ('The soak should finish in about 3 minutes. Nothing else can usefully run until it does.', 'Cogitated for 11m 29s · done 8:46 PM'). The background-command completion resumed it before the 2-minute wait ran out, so I never replied.
