# Bug: The agent did not keep its turn open while the suite ran. It started the 12-minute suite as a background shell and ended its turn ('Baked for 14s · done 11:03 AM · 1 shell still running'). It needed four 'continue' prompts before it showed the integration options. This looks like the behavior the story title is measuring.

**Kind:** bug
**Scenario:** finish-long-suite
**Scenario Status:** pass

## Description

The agent did not keep its turn open while the suite ran. It started the 12-minute suite as a background shell and ended its turn ('Baked for 14s · done 11:03 AM · 1 shell still running'). It needed four 'continue' prompts before it showed the integration options. This looks like the behavior the story title is measuring.
