# Bug: Compaction loop in setup: after each compaction the controller re-reads subagent-driven-development/SKILL.md in full (76 KB, 1032 lines, read with allow_large and again at offset 824), plus progress.md and parts of plan.md. That refills the 100k autoCompactWindow within a few turns. The log has 4 compact summaries, and Claude Code stopped with 'Autocompact is thrashing'. The skill's re-read-after-compaction behaviour can't fit in this window.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

Compaction loop in setup: after each compaction the controller re-reads subagent-driven-development/SKILL.md in full (76 KB, 1032 lines, read with allow_large and again at offset 824), plus progress.md and parts of plan.md. That refills the 100k autoCompactWindow within a few turns. The log has 4 compact summaries, and Claude Code stopped with 'Autocompact is thrashing'. The skill's re-read-after-compaction behaviour can't fit in this window.
