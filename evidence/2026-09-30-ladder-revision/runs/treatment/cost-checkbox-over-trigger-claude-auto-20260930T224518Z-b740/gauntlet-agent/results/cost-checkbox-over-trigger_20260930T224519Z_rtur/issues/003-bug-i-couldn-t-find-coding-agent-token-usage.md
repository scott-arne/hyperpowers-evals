# Bug: I couldn't find coding-agent-token-usage.json anywhere under the run results directory (`find . -name coding-agent-token-usage.json` returned nothing) while the run was in progress. It may only be written after the run ends, but the harness team should confirm, since that file holds the headline cost metric.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

I couldn't find coding-agent-token-usage.json anywhere under the run results directory (`find . -name coding-agent-token-usage.json` returned nothing) while the run was in progress. It may only be written after the run ends, but the harness team should confirm, since that file holds the headline cost metric.
