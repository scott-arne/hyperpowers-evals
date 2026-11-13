# Performance: The run took about 28 minutes and logged 18 compaction boundaries. The controller re-read its skill/step files after almost every one (for example, 'I'm re-reading the fix template because the copy I had did not survive the compaction'), which adds time to each step.

**Kind:** performance
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

The run took about 28 minutes and logged 18 compaction boundaries. The controller re-read its skill/step files after almost every one (for example, 'I'm re-reading the fix template because the copy I had did not survive the compaction'), which adds time to each step.
