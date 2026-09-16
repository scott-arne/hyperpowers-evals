# Bug: No coding-agent-token-usage.json existed in the results dir at the time the stopping condition was reached (ls showed only coding-agent-workdir, gauntlet-agent, home, phase.json), so the headline cost number could not be read from the harness during the run.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** fail

## Description

No coding-agent-token-usage.json existed in the results dir at the time the stopping condition was reached (ls showed only coding-agent-workdir, gauntlet-agent, home, phase.json), so the headline cost number could not be read from the harness during the run.
