# Bug: No coding-agent-token-usage.json was produced: `find . -name '*token-usage*'` under the run results dir returned nothing (dir contains only coding-agent-workdir, gauntlet-agent, home, phase.json). The scenario's headline cost metric file is therefore missing at the end of the session.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

No coding-agent-token-usage.json was produced: `find . -name '*token-usage*'` under the run results dir returned nothing (dir contains only coding-agent-workdir, gauntlet-agent, home, phase.json). The scenario's headline cost metric file is therefore missing at the end of the session.
