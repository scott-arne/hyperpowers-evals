# Bug: After each compaction the controller re-read the full SDD SKILL.md, which is 1034 lines and 76,445 bytes, in two large Read calls (limit 820, then offset 821). With autoCompactWindow=100000 that alone nearly fills the window, so each compaction was followed by another. The log has 3 compact_boundary events at 23:39:58, 23:40:36 and 23:41:16. Claude Code then aborted with 'Autocompact is thrashing'. The re-read-after-compaction behaviour this scenario measures makes the controller unable to continue.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

After each compaction the controller re-read the full SDD SKILL.md, which is 1034 lines and 76,445 bytes, in two large Read calls (limit 820, then offset 821). With autoCompactWindow=100000 that alone nearly fills the window, so each compaction was followed by another. The log has 3 compact_boundary events at 23:39:58, 23:40:36 and 23:41:16. Claude Code then aborted with 'Autocompact is thrashing'. The re-read-after-compaction behaviour this scenario measures makes the controller unable to continue.
