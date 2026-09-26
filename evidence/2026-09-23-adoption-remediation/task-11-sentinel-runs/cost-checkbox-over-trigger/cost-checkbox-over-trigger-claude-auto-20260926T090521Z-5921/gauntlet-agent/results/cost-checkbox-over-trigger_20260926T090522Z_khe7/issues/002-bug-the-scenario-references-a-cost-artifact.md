# Bug: The scenario references a cost artifact `coding-agent-token-usage.json`, but `find` over the run results directory returned no such file at the time the session ended, so the headline token total was not observable to me.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

The scenario references a cost artifact `coding-agent-token-usage.json`, but `find` over the run results directory returned no such file at the time the session ended, so the headline token total was not observable to me.
