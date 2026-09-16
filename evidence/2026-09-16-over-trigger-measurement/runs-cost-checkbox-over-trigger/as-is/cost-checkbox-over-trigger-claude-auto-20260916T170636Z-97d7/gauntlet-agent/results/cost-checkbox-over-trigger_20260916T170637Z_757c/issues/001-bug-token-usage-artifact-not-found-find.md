# Bug: Token-usage artifact not found: `find . -name 'coding-agent-token-usage.json'` under the run results dir returned nothing at the time the task completed — the scenario's headline metric file may be written only at harness teardown, but worth confirming.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

Token-usage artifact not found: `find . -name 'coding-agent-token-usage.json'` under the run results dir returned nothing at the time the task completed — the scenario's headline metric file may be written only at harness teardown, but worth confirming.
