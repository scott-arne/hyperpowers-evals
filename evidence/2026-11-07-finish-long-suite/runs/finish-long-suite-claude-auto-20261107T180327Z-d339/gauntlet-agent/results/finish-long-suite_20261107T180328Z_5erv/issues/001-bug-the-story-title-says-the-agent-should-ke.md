# Bug: The story title says the agent should keep its turn open while the long suite runs. It didn't: it ran the suite as a background shell and ended its turn right away ('Worked for 18s · 1 shell still running'). It needed 4 'continue' nudges over about 11 minutes before it showed the integration options. Each nudge produced only a progress check (e.g. 'corpus replay is at 13 of 35 entries'). For the behavior this measurement targets, this looks like a regression engineers should look at.

**Kind:** bug
**Scenario:** finish-long-suite
**Scenario Status:** pass

## Description

The story title says the agent should keep its turn open while the long suite runs. It didn't: it ran the suite as a background shell and ended its turn right away ('Worked for 18s · 1 shell still running'). It needed 4 'continue' nudges over about 11 minutes before it showed the integration options. Each nudge produced only a progress check (e.g. 'corpus replay is at 13 of 35 entries'). For the behavior this measurement targets, this looks like a regression engineers should look at.
