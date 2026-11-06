# Bug: The agent did not follow the empty-frontier rule. It skipped `sdd-state next` and tried `sdd-state claim` on every task to find out which were free, then asked the user instead of posting a `--kind tasks` waiting record and printing `sdd-state board`. Either the SKILL.md wording doesn't steer the agent to next → wait → board strongly enough, or the agent ignored it.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** fail

## Description

The agent did not follow the empty-frontier rule. It skipped `sdd-state next` and tried `sdd-state claim` on every task to find out which were free, then asked the user instead of posting a `--kind tasks` waiting record and printing `sdd-state board`. Either the SKILL.md wording doesn't steer the agent to next → wait → board strongly enough, or the agent ignored it.
