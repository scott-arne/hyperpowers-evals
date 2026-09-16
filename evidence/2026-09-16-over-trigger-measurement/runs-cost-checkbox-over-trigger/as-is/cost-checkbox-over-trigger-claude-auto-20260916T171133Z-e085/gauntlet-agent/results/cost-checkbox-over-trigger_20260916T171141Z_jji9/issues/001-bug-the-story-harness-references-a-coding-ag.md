# Bug: The story/harness references a coding-agent-token-usage.json as the headline cost artifact, but no such file exists in the run dir (ls showed only coding-agent-workdir, gauntlet-agent, home, phase.json). The cost measurement may be captured elsewhere or missing.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

The story/harness references a coding-agent-token-usage.json as the headline cost artifact, but no such file exists in the run dir (ls showed only coding-agent-workdir, gauntlet-agent, home, phase.json). The cost measurement may be captured elsewhere or missing.
