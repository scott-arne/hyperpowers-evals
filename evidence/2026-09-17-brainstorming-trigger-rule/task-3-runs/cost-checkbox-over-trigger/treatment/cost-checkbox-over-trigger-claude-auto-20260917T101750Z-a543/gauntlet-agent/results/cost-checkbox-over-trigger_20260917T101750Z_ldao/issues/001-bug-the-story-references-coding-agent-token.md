# Bug: The story references coding-agent-token-usage.json as the headline metric, but `find` under the results dir returned no such file at the time of testing (only coding-agent-workdir, gauntlet-agent, home, phase.json). May be written post-run, but worth verifying the cost instrument exists.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

The story references coding-agent-token-usage.json as the headline metric, but `find` under the results dir returned no such file at the time of testing (only coding-agent-workdir, gauntlet-agent, home, phase.json). May be written post-run, but worth verifying the cost instrument exists.
