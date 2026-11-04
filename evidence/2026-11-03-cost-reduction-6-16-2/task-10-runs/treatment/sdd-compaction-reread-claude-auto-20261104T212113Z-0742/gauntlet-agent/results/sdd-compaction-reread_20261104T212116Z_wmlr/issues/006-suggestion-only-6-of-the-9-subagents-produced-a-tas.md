# Suggestion: Only 6 of the 9 subagents produced a task-notification in the main log. Reviews 2–4 seem to have completed while a compaction was running. The controller recovered by checking git state and reading the output file, but the engineers should confirm that notifications aren't being lost during compaction.

**Kind:** suggestion
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

Only 6 of the 9 subagents produced a task-notification in the main log. Reviews 2–4 seem to have completed while a compaction was running. The controller recovered by checking git state and reading the output file, but the engineers should confirm that notifications aren't being lost during compaction.
