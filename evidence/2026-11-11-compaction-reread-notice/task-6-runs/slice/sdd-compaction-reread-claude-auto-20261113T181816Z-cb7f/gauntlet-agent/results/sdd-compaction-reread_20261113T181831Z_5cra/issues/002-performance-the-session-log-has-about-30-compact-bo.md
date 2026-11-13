# Performance: The session log has about 30 'compact_boundary' entries in roughly 40 minutes, and the screen often showed '0% until auto-compact'. Every compaction re-attached the same files (task-reviewer-prompt.md, review-and-complete.md, implementer-prompt.md, the task output file), which wastes context.

**Kind:** performance
**Scenario:** sdd-compaction-reread
**Scenario Status:** investigate

## Description

The session log has about 30 'compact_boundary' entries in roughly 40 minutes, and the screen often showed '0% until auto-compact'. Every compaction re-attached the same files (task-reviewer-prompt.md, review-and-complete.md, implementer-prompt.md, the task output file), which wastes context.
