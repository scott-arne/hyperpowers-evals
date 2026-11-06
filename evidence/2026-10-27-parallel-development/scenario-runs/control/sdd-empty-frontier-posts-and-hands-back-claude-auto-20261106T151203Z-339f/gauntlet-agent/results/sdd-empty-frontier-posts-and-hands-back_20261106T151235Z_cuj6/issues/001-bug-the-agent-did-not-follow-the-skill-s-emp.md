# Bug: The agent did not follow the skill's empty-frontier procedure. Instead of `sdd-state next`, `sdd-state wait --kind tasks` and `sdd-state board`, it tried `sdd-state claim` on each task, got held/exit=4, and asked the user whether to take over. The skill text either doesn't push the agent strongly enough toward next→wait→board, or the agent skipped it.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** fail

## Description

The agent did not follow the skill's empty-frontier procedure. Instead of `sdd-state next`, `sdd-state wait --kind tasks` and `sdd-state board`, it tried `sdd-state claim` on each task, got held/exit=4, and asked the user whether to take over. The skill text either doesn't push the agent strongly enough toward next→wait→board, or the agent skipped it.
