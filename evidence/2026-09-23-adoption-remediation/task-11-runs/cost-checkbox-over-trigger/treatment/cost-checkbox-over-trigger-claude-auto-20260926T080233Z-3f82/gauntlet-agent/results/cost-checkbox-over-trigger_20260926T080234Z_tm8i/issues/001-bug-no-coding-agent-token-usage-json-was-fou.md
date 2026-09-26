# Bug: No coding-agent-token-usage.json was found anywhere under the run results dir (`find ... -name 'coding-agent-token-usage.json'` returned nothing at the time I checked, before /exit). If the harness expects that file as the headline cost metric, it may only be written at teardown — worth confirming.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

No coding-agent-token-usage.json was found anywhere under the run results dir (`find ... -name 'coding-agent-token-usage.json'` returned nothing at the time I checked, before /exit). If the harness expects that file as the headline cost metric, it may only be written at teardown — worth confirming.
