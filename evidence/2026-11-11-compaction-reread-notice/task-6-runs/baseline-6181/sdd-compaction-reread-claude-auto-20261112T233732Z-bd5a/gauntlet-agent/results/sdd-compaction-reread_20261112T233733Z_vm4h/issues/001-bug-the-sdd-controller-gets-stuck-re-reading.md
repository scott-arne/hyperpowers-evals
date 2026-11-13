# Bug: The SDD controller gets stuck re-reading after compaction. Its rule to re-read SKILL.md in full after compaction (screen: "Re-reading SKILL.md in full, as required after compaction, then the ledger and git log.") plus a 1034-line SKILL.md and a 27.6KB plan.md fill the 100k autoCompactWindow almost straight away. The log shows the same Read pair repeated (SKILL.md limit 820, then offset 821) at least 3 times, and 4 compact_boundary entries. Compaction hit before Task 1 even started, not after the first task as the scenario expected.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

The SDD controller gets stuck re-reading after compaction. Its rule to re-read SKILL.md in full after compaction (screen: "Re-reading SKILL.md in full, as required after compaction, then the ledger and git log.") plus a 1034-line SKILL.md and a 27.6KB plan.md fill the 100k autoCompactWindow almost straight away. The log shows the same Read pair repeated (SKILL.md limit 820, then offset 821) at least 3 times, and 4 compact_boundary entries. Compaction hit before Task 1 even started, not after the first task as the scenario expected.
