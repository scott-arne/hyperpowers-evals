# Suggestion: Compaction happened very often: 14 compact_boundary events in about 15 minutes, roughly one per agent dispatch or notification. The controller kept the task loop going through all of them, and each time re-read progress.md, global-constraints.md and the SDD prompts, so its state survived compaction. This re-reading costs extra tokens.

**Kind:** suggestion
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

Compaction happened very often: 14 compact_boundary events in about 15 minutes, roughly one per agent dispatch or notification. The controller kept the task loop going through all of them, and each time re-read progress.md, global-constraints.md and the SDD prompts, so its state survived compaction. This re-reading costs extra tokens.
