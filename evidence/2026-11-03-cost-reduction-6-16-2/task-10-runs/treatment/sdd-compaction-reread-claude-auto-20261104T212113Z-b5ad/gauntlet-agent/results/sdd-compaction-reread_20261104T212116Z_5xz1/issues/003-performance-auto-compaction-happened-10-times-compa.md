# Performance: Auto-compaction happened 10 times (compact_boundary events from 21:24 to 21:42). After each one the controller reloaded progress.md, global-constraints.md, task-reviewer-prompt.md and implementer-prompt.md. It said things like 'Re-reading the full skill after compaction' and 'Task 3 hasn't been dispatched yet', which suggests it worked out where it was from the progress ledger. The whole run took about 21 minutes.

**Kind:** performance
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

Auto-compaction happened 10 times (compact_boundary events from 21:24 to 21:42). After each one the controller reloaded progress.md, global-constraints.md, task-reviewer-prompt.md and implementer-prompt.md. It said things like 'Re-reading the full skill after compaction' and 'Task 3 hasn't been dispatched yet', which suggests it worked out where it was from the progress ledger. The whole run took about 21 minutes.
