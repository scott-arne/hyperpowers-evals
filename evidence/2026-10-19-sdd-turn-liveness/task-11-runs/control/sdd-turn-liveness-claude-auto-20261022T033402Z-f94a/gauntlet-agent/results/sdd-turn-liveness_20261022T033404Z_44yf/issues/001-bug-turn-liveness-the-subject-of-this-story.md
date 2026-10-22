# Bug: Turn liveness (the subject of this story): during the 12-minute long soak (Task 6), the agent ended its turn three times in a row and left the prompt idle. The only sign of activity was the footer '1 shell'; no spinner showed. Its messages said it would 'pick up as soon as' the soak finished. Each 'continue' only produced a status check and another turn end, e.g. 'It should be done in about 3–4 minutes, and I'll be notified when it exits.' In the end the background-shell completion notification resumed it.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Turn liveness (the subject of this story): during the 12-minute long soak (Task 6), the agent ended its turn three times in a row and left the prompt idle. The only sign of activity was the footer '1 shell'; no spinner showed. Its messages said it would 'pick up as soon as' the soak finished. Each 'continue' only produced a status check and another turn end, e.g. 'It should be done in about 3–4 minutes, and I'll be notified when it exits.' In the end the background-shell completion notification resumed it.
