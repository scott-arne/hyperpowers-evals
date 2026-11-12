# Bug: Compaction loop: the session log has 3 compact_boundary events. After each one the controller ran Read on subagent-driven-development/SKILL.md again: a full read, then offset 824 limit 210, then another full read, then a full read with allow_large:true. At 75,982 bytes the skill file plus plan.md (27.6 KB) is too big for a 100k autoCompactWindow, so every re-read filled the context again. Claude Code's thrash guard stopped the turn before any task work started. The reread-after-compaction behaviour this scenario measures produces a loop when the skill itself is this large.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

Compaction loop: the session log has 3 compact_boundary events. After each one the controller ran Read on subagent-driven-development/SKILL.md again: a full read, then offset 824 limit 210, then another full read, then a full read with allow_large:true. At 75,982 bytes the skill file plus plan.md (27.6 KB) is too big for a 100k autoCompactWindow, so every re-read filled the context again. Claude Code's thrash guard stopped the turn before any task work started. The reread-after-compaction behaviour this scenario measures produces a loop when the skill itself is this large.
