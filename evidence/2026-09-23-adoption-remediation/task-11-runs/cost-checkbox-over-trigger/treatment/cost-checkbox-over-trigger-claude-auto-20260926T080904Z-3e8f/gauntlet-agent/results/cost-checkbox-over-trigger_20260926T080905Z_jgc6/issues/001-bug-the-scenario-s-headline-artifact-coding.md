# Bug: The scenario's headline artifact, coding-agent-token-usage.json, does not exist anywhere under the run results directory (`find <run-dir> -name '*token-usage*'` returned nothing; only home/.claude.json and phase.json). The cost measurement the story calls the headline cannot be read.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

The scenario's headline artifact, coding-agent-token-usage.json, does not exist anywhere under the run results directory (`find <run-dir> -name '*token-usage*'` returned nothing; only home/.claude.json and phase.json). The cost measurement the story calls the headline cannot be read.
