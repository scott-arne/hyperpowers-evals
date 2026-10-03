# Bug: I could not find coding-agent-token-usage.json in the results directory (`find . -name coding-agent-token-usage.json` returned nothing). It may only be written after the run is torn down, but the cost headline depends on it.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

I could not find coding-agent-token-usage.json in the results directory (`find . -name coding-agent-token-usage.json` returned nothing). It may only be written after the run is torn down, but the cost headline depends on it.
