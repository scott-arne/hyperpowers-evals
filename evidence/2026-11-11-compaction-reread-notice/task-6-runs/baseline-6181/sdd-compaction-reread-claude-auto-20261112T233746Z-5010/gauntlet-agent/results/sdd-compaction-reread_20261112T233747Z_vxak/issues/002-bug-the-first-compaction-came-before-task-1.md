# Bug: The first compaction came before task 1 was even sent out. The scenario expected it after the first task. In setup alone (skill load, cat plan.md, sdd-state sync/snapshot, reading SKILL.md), the controller used up almost the whole window.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

The first compaction came before task 1 was even sent out. The scenario expected it after the first task. In setup alone (skill load, cat plan.md, sdd-state sync/snapshot, reading SKILL.md), the controller used up almost the whole window.
