# Performance: Compaction happened very often: the log has 36 compact_boundary/isCompactSummary entries, about 18 compactions in 19 minutes. After each one the controller re-read task-N-brief.md, progress.md and the skill prompt files, then continued. It held its place in the loop, but this is a lot of repeated reading.

**Kind:** performance
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

Compaction happened very often: the log has 36 compact_boundary/isCompactSummary entries, about 18 compactions in 19 minutes. After each one the controller re-read task-N-brief.md, progress.md and the skill prompt files, then continued. It held its place in the loop, but this is a lot of repeated reading.
