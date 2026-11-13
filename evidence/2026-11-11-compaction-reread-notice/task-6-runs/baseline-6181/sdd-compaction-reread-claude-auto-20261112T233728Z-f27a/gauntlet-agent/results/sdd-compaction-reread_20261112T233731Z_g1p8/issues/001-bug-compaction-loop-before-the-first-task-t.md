# Bug: Compaction loop before the first task: the log has 9 compact_boundary entries between 23:39:32 and 23:45:00. After each one, the controller read SKILL.md 1–3 times plus the ledger and git log, which pushed the context straight back over the 100k autoCompactWindow. SKILL.md was read 19 times in total. The screen said 'Re-reading the full SDD skill and the ledger after compaction.' The re-read-after-compaction behaviour seems to cost more context than one cycle allows in this setup, so the loop never settles.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

Compaction loop before the first task: the log has 9 compact_boundary entries between 23:39:32 and 23:45:00. After each one, the controller read SKILL.md 1–3 times plus the ledger and git log, which pushed the context straight back over the 100k autoCompactWindow. SKILL.md was read 19 times in total. The screen said 'Re-reading the full SDD skill and the ledger after compaction.' The re-read-after-compaction behaviour seems to cost more context than one cycle allows in this setup, so the loop never settles.
