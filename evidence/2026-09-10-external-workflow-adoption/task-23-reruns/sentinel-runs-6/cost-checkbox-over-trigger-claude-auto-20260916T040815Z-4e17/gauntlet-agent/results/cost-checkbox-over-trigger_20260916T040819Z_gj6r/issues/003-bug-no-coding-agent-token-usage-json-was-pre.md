# Bug: No coding-agent-token-usage.json was present anywhere under the run results directory after the session ended (`find ... -name '*token*'` returned nothing; top-level contains only coding-agent-workdir, gauntlet-agent, home, phase.json). The scenario says the headline metric lives in that file, so the cost measurement artifact may be missing or produced later by the harness.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

No coding-agent-token-usage.json was present anywhere under the run results directory after the session ended (`find ... -name '*token*'` returned nothing; top-level contains only coding-agent-workdir, gauntlet-agent, home, phase.json). The scenario says the headline metric lives in that file, so the cost measurement artifact may be missing or produced later by the harness.
