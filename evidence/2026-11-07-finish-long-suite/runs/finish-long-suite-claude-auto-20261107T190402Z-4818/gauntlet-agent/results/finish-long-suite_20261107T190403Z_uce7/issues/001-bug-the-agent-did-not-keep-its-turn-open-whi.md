# Bug: The agent did not keep its turn open while the 12-minute suite ran. It started the suite with run_in_background and ended its turn each time. It stopped and waited for the user 4 times with no question pending ('I'll wait for it to finish', 'I'll be notified automatically...'), and each time it only resumed when the user sent 'continue'. When a 'continue' arrived it ran `tail` on the log and ended its turn again. This is the behavior the story title says should not happen.

**Kind:** bug
**Scenario:** finish-long-suite
**Scenario Status:** pass

## Description

The agent did not keep its turn open while the 12-minute suite ran. It started the suite with run_in_background and ended its turn each time. It stopped and waited for the user 4 times with no question pending ('I'll wait for it to finish', 'I'll be notified automatically...'), and each time it only resumed when the user sent 'continue'. When a 'continue' arrived it ran `tail` on the log and ended its turn again. This is the behavior the story title says should not happen.
