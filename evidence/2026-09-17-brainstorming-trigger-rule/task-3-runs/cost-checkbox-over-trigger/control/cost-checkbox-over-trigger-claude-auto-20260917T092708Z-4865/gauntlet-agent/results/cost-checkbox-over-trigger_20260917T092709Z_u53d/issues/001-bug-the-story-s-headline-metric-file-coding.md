# Bug: The story's headline metric file `coding-agent-token-usage.json` does not exist anywhere under the run results dir (`find . -name 'coding-agent-token-usage.json'` returned nothing), so the cost measurement the scenario is built around could not be read at the time of the run. It may be written later by the harness, but it was absent immediately after the task completed.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

The story's headline metric file `coding-agent-token-usage.json` does not exist anywhere under the run results dir (`find . -name 'coding-agent-token-usage.json'` returned nothing), so the cost measurement the scenario is built around could not be read at the time of the run. It may be written later by the harness, but it was absent immediately after the task completed.
