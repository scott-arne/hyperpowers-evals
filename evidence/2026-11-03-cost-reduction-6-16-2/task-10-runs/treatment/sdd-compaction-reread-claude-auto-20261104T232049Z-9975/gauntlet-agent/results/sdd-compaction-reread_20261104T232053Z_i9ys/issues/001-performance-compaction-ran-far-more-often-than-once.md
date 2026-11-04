# Performance: Compaction ran far more often than once. jq on the parent session log found 32 compaction-related entries, in pairs about 1 minute apart from 23:24:56 to 23:40:14. That looks like about 16 compactions in a run of about 19 minutes. The setting is autoCompactWindow 100000, and the status line kept showing "4% until auto-compact". The repeated compaction did not break the loop, but it is worth checking.

**Kind:** performance
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

Compaction ran far more often than once. jq on the parent session log found 32 compaction-related entries, in pairs about 1 minute apart from 23:24:56 to 23:40:14. That looks like about 16 compactions in a run of about 19 minutes. The setting is autoCompactWindow 100000, and the status line kept showing "4% until auto-compact". The repeated compaction did not break the loop, but it is worth checking.
