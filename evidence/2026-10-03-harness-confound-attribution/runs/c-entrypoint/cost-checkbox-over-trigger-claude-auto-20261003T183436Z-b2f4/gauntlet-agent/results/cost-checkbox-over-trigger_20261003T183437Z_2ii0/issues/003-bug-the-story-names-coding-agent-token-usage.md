# Bug: The story names coding-agent-token-usage.json as the headline cost metric, but no file with that name exists in the run results directory (`find . -name coding-agent-token-usage.json` returned nothing). It may be written after the run finishes. If not, the cost measurement will be missing.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

The story names coding-agent-token-usage.json as the headline cost metric, but no file with that name exists in the run results directory (`find . -name coding-agent-token-usage.json` returned nothing). It may be written after the run finishes. If not, the cost measurement will be missing.
