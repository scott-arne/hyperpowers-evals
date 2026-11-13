# Performance: Auto-compaction fired about 21 times in roughly 25 minutes, about once a minute (system compact_boundary entries from 18:23:37 to 18:47:40). The test fixture set it up this way on purpose. Each time, the controller re-read SKILL.md and the state file ('Re-reading SKILL.md and the state after compaction') and continued correctly.

**Kind:** performance
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

Auto-compaction fired about 21 times in roughly 25 minutes, about once a minute (system compact_boundary entries from 18:23:37 to 18:47:40). The test fixture set it up this way on purpose. Each time, the controller re-read SKILL.md and the state file ('Re-reading SKILL.md and the state after compaction') and continued correctly.
