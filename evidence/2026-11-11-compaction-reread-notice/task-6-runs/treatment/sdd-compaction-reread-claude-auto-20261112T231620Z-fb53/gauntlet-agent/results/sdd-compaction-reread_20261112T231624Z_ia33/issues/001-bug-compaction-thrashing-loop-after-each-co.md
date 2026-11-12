# Bug: Compaction thrashing loop. After each compaction the controller re-read SKILL.md: a full read, then `offset 824 limit 210`, then a full read with allow_large:true, repeated about 3 times. Each read refilled the context, which has autoCompactWindow 100000 in .claude/settings.json. The log has 3 'compact_boundary' system entries, and then Claude Code aborted. The re-read-after-compaction behavior is what this scenario is testing, and with a 76KB SKILL.md it never gets past setup.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

Compaction thrashing loop. After each compaction the controller re-read SKILL.md: a full read, then `offset 824 limit 210`, then a full read with allow_large:true, repeated about 3 times. Each read refilled the context, which has autoCompactWindow 100000 in .claude/settings.json. The log has 3 'compact_boundary' system entries, and then Claude Code aborted. The re-read-after-compaction behavior is what this scenario is testing, and with a 76KB SKILL.md it never gets past setup.
