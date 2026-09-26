# Bug: The headline artifact for this scenario, coding-agent-token-usage.json, was not present anywhere under the run results dir (find -maxdepth 2 for '*.json' returned only home/.claude.json and phase.json) at the time the session ended. If it is meant to be produced by the harness post-run this is fine; otherwise the cost measurement has no output.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

The headline artifact for this scenario, coding-agent-token-usage.json, was not present anywhere under the run results dir (find -maxdepth 2 for '*.json' returned only home/.claude.json and phase.json) at the time the session ended. If it is meant to be produced by the harness post-run this is fine; otherwise the cost measurement has no output.
