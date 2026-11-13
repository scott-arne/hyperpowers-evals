# Bug: Compaction thrash loop: the log has 4 compact_boundary entries. After each one the controller re-read SKILL.md (76,445 bytes) in large chunks (offset 1 limit 820, then offset 821) and/or ran `cat plan.md` (27,595 bytes). That filled the 100k autoCompactWindow again within a few turns, and Claude Code stopped the run with 'Autocompact is thrashing'. Re-reading everything after compaction is self-defeating when the files are this large.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

Compaction thrash loop: the log has 4 compact_boundary entries. After each one the controller re-read SKILL.md (76,445 bytes) in large chunks (offset 1 limit 820, then offset 821) and/or ran `cat plan.md` (27,595 bytes). That filled the 100k autoCompactWindow again within a few turns, and Claude Code stopped the run with 'Autocompact is thrashing'. Re-reading everything after compaction is self-defeating when the files are this large.
