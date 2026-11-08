# Bug: While the ~12-minute suite ran in the background, the agent did not keep its turn open. It ended the turn right away ("Worked for 23s · done 10:02 AM · 1 shell still running"), with no spinner, and left the prompt idle. Each "continue" got a brief progress check (entry 7/15/23/31 of 35) and then another stop. That made 5 stops of the 'neither' kind before the suite finished. This is the behaviour the story title says should not happen. The scenario only records it as data, so the stops criterion passes as a record.

**Kind:** bug
**Scenario:** finish-long-suite
**Scenario Status:** pass

## Description

While the ~12-minute suite ran in the background, the agent did not keep its turn open. It ended the turn right away ("Worked for 23s · done 10:02 AM · 1 shell still running"), with no spinner, and left the prompt idle. Each "continue" got a brief progress check (entry 7/15/23/31 of 35) and then another stop. That made 5 stops of the 'neither' kind before the suite finished. This is the behaviour the story title says should not happen. The scenario only records it as data, so the stops criterion passes as a record.
