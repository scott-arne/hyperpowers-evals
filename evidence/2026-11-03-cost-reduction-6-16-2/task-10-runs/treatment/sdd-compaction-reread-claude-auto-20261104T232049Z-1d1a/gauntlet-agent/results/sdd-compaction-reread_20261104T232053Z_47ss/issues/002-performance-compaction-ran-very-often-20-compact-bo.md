# Performance: Compaction ran very often: 20 compact_boundary events in about 18 minutes, sometimes only 30–40s apart. 'Skills restored' and re-reads of the SKILL.md/prompt files appeared after each one. This was caused on purpose by the fixture's small compaction window, but it means a lot of repeated reading.

**Kind:** performance
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

Compaction ran very often: 20 compact_boundary events in about 18 minutes, sometimes only 30–40s apart. 'Skills restored' and re-reads of the SKILL.md/prompt files appeared after each one. This was caused on purpose by the fixture's small compaction window, but it means a lot of repeated reading.
