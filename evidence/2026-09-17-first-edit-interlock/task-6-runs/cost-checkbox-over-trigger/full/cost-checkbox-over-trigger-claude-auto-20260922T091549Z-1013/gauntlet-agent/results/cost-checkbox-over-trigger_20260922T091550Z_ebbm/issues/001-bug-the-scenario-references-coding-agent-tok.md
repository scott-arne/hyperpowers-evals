# Bug: The scenario references coding-agent-token-usage.json as the headline cost metric, but no such file exists in the results dir at run end (ls showed only coding-agent-workdir, gauntlet-agent, home, phase.json). The cost measurement artifact may be produced later or may be missing.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

The scenario references coding-agent-token-usage.json as the headline cost metric, but no such file exists in the results dir at run end (ls showed only coding-agent-workdir, gauntlet-agent, home, phase.json). The cost measurement artifact may be produced later or may be missing.
