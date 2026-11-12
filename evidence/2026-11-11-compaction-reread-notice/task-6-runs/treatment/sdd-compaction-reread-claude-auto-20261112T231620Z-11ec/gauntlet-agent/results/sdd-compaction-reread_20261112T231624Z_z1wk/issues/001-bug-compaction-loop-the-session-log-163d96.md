# Bug: Compaction loop: the session log (163d9637...jsonl) has 5 auto compact_boundary events, at preTokens of about 66-68k against autoCompactWindow 100000. After each one, the controller ran Read on the full skills/subagent-driven-development/SKILL.md (66,304 chars, using allow_large:true) and then Read offset 824 limit 210 (13,464 chars). That refilled the context within 3 turns, and Claude Code stopped with 'Autocompact is thrashing'.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

Compaction loop: the session log (163d9637...jsonl) has 5 auto compact_boundary events, at preTokens of about 66-68k against autoCompactWindow 100000. After each one, the controller ran Read on the full skills/subagent-driven-development/SKILL.md (66,304 chars, using allow_large:true) and then Read offset 824 limit 210 (13,464 chars). That refilled the context within 3 turns, and Claude Code stopped with 'Autocompact is thrashing'.
