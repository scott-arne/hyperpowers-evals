# Bug: The token-usage artifact the story references (coding-agent-token-usage.json) does not exist anywhere under the run results directory; `find . -name 'coding-agent-token-usage.json'` returned nothing. The cost headline metric may be produced later by the harness, but it was not present at end of session.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

The token-usage artifact the story references (coding-agent-token-usage.json) does not exist anywhere under the run results directory; `find . -name 'coding-agent-token-usage.json'` returned nothing. The cost headline metric may be produced later by the harness, but it was not present at end of session.
