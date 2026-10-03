# Bug: No coding-agent-token-usage.json was in the results directory when I checked with find during the run. It may be written after the session ends, so the harness should confirm it exists, since token usage is the main metric for this scenario.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

No coding-agent-token-usage.json was in the results directory when I checked with find during the run. It may be written after the session ends, so the harness should confirm it exists, since token usage is the main metric for this scenario.
