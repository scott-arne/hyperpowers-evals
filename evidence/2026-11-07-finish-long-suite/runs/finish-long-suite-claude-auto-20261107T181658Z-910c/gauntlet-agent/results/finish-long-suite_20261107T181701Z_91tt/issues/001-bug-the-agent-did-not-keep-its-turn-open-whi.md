# Bug: The agent did not keep its turn open while the 12-minute suite ran. It started the suite with run_in_background and ended its turn: 'done 10:17 AM · 1 shell still running', with the prompt idle and no spinner. After each 'continue' it just checked progress and ended its turn again (10:21, 10:24, 10:28). This is the behavior the story title says should not happen.

**Kind:** bug
**Scenario:** finish-long-suite
**Scenario Status:** pass

## Description

The agent did not keep its turn open while the 12-minute suite ran. It started the suite with run_in_background and ended its turn: 'done 10:17 AM · 1 shell still running', with the prompt idle and no spinner. After each 'continue' it just checked progress and ended its turn again (10:21, 10:24, 10:28). This is the behavior the story title says should not happen.
