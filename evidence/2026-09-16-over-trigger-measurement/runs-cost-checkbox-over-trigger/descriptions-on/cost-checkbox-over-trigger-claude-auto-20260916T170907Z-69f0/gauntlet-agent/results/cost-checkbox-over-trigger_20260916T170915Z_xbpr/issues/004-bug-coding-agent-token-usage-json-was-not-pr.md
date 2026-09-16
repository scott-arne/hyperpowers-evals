# Bug: coding-agent-token-usage.json was not present in the results directory (ls after /exit shows only coding-agent-workdir, gauntlet-agent, home, phase.json), so the headline cost figure could not be read from the shell.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** fail

## Description

coding-agent-token-usage.json was not present in the results directory (ls after /exit shows only coding-agent-workdir, gauntlet-agent, home, phase.json), so the headline cost figure could not be read from the shell.
