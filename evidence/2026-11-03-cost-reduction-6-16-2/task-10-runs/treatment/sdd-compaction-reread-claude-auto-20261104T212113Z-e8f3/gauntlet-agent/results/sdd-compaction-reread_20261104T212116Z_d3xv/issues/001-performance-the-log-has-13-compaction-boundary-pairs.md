# Performance: The log has 13 compaction-boundary pairs between 21:24 and 21:38, roughly one per minute. After every compaction the controller re-reads SKILL.md, the prompt templates and the ledger (progress.md). The loop stayed correct, but this cost a lot of time and tokens. The small autoCompactWindow (100000) in the fixture likely causes this, but the re-reads after each compaction add to it.

**Kind:** performance
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

The log has 13 compaction-boundary pairs between 21:24 and 21:38, roughly one per minute. After every compaction the controller re-reads SKILL.md, the prompt templates and the ledger (progress.md). The loop stayed correct, but this cost a lot of time and tokens. The small autoCompactWindow (100000) in the fixture likely causes this, but the re-reads after each compaction add to it.
