# Bug: The expected cost artifact coding-agent-token-usage.json does not exist in the results directory after the run (ls shows only coding-agent-workdir, gauntlet-agent, home, phase.json), so the headline token total could not be observed. It may be written by tooling after the harness finishes, but I could not verify it.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

The expected cost artifact coding-agent-token-usage.json does not exist in the results directory after the run (ls shows only coding-agent-workdir, gauntlet-agent, home, phase.json), so the headline token total could not be observed. It may be written by tooling after the harness finishes, but I could not verify it.
