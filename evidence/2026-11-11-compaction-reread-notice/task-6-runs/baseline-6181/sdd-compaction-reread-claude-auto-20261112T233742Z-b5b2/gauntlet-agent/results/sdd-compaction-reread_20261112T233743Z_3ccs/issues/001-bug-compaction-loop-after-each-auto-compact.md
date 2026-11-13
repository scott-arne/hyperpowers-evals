# Bug: Compaction loop: after each auto-compaction, the SDD controller re-reads the whole SKILL.md (1,034 lines, 76,445 bytes) using Read with allow_large:true or split reads (limit 820 / offset 821). With autoCompactWindow 100000 this pushes context back to the limit (preTokens about 61k–71k each time), which starts another compaction. The log has 6 compact_boundary entries, and cumulativeDroppedTokens reached 307,982 before Claude Code stopped the loop.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

Compaction loop: after each auto-compaction, the SDD controller re-reads the whole SKILL.md (1,034 lines, 76,445 bytes) using Read with allow_large:true or split reads (limit 820 / offset 821). With autoCompactWindow 100000 this pushes context back to the limit (preTokens about 61k–71k each time), which starts another compaction. The log has 6 compact_boundary entries, and cumulativeDroppedTokens reached 307,982 before Claude Code stopped the loop.
