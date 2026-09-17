# Bug: coding-agent-token-usage.json (the headline cost artifact named in the story) did not exist in the results directory at the time of my check; `ls` of the run root showed only coding-agent-workdir, gauntlet-agent, home, phase.json. Per-request usage is available in the session jsonl (~35k cache-read peak, ~3.4k output tokens total across 7 assistant records).

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

coding-agent-token-usage.json (the headline cost artifact named in the story) did not exist in the results directory at the time of my check; `ls` of the run root showed only coding-agent-workdir, gauntlet-agent, home, phase.json. Per-request usage is available in the session jsonl (~35k cache-read peak, ~3.4k output tokens total across 7 assistant records).
