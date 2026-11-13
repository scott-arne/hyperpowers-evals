# Performance: Compaction happened very often: 18 compact_boundary entries in roughly 22 minutes, and the screen showed '0% until auto-compact'. That matches the small compaction window the scenario sets up. The controller re-read its skill and ledger files after compacting ('re-reading the skill and the ledger as the compaction notice requires'). The whole run took about 26 minutes.

**Kind:** performance
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

Compaction happened very often: 18 compact_boundary entries in roughly 22 minutes, and the screen showed '0% until auto-compact'. That matches the small compaction window the scenario sets up. The controller re-read its skill and ledger files after compacting ('re-reading the skill and the ledger as the compaction notice requires'). The whole run took about 26 minutes.
