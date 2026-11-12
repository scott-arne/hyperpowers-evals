# Bug: Compaction happened during setup (worktree mode choice, baseline npm test, ledger creation, pre-flight conflict scan), not after the first task as the scenario intended. With a window this small, the skill file is too big to re-read whole after a compaction.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

Compaction happened during setup (worktree mode choice, baseline npm test, ledger creation, pre-flight conflict scan), not after the first task as the scenario intended. With a window this small, the skill file is too big to re-read whole after a compaction.
