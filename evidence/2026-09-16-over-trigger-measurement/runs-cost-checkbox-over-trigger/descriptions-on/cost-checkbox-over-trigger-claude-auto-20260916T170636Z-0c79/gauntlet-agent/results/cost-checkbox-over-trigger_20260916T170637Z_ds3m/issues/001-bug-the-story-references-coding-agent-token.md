# Bug: The story references coding-agent-token-usage.json as the headline cost artifact, but `find . -name '*token-usage*'` under the run results dir returned nothing while the run was live — only coding-agent-workdir, gauntlet-agent, home, phase.json exist. It may be written at teardown, but it was not observable during the run.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

The story references coding-agent-token-usage.json as the headline cost artifact, but `find . -name '*token-usage*'` under the run results dir returned nothing while the run was live — only coding-agent-workdir, gauntlet-agent, home, phase.json exist. It may be written at teardown, but it was not observable during the run.
