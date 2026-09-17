# Bug: The story references coding-agent-token-usage.json as the headline metric, but no such file exists in the run results dir at the end of the session (ls showed only coding-agent-workdir, gauntlet-agent, home, phase.json). Token totals could not be verified from the adapter side.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

The story references coding-agent-token-usage.json as the headline metric, but no such file exists in the run results dir at the end of the session (ls showed only coding-agent-workdir, gauntlet-agent, home, phase.json). Token totals could not be verified from the adapter side.
