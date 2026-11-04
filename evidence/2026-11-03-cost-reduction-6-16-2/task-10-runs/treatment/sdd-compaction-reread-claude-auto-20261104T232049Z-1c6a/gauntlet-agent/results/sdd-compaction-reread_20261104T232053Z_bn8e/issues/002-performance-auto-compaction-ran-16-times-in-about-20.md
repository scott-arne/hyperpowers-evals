# Performance: Auto-compaction ran 16 times in about 20 minutes (from 23:24:32 to 23:41:36), roughly once a minute. SKILL.md was read 15 times. The re-reading worked, but it adds a lot of overhead. The cause is the eval's small compaction window.

**Kind:** performance
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

Auto-compaction ran 16 times in about 20 minutes (from 23:24:32 to 23:41:36), roughly once a minute. SKILL.md was read 15 times. The re-reading worked, but it adds a lot of overhead. The cause is the eval's small compaction window.
