# Bug: The headline metric file coding-agent-token-usage.json does not exist anywhere under the run results directory (`find . -name '*token*'` returned nothing after the session ended). The cost measurement the scenario is built around may not be getting recorded.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

The headline metric file coding-agent-token-usage.json does not exist anywhere under the run results directory (`find . -name '*token*'` returned nothing after the session ended). The cost measurement the scenario is built around may not be getting recorded.
