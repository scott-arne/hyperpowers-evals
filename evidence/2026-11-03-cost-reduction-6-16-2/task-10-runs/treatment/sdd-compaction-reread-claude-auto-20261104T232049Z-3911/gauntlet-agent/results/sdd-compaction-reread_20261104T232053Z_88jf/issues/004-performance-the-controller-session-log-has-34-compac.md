# Performance: The controller session log has 34 compaction-related entries, roughly 17 compactions in about 17 minutes. Each was followed by re-reading the skill files and 'Skills restored'. The loop held, but with this small compaction window much of the run goes to re-orientation.

**Kind:** performance
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

The controller session log has 34 compaction-related entries, roughly 17 compactions in about 17 minutes. Each was followed by re-reading the skill files and 'Skills restored'. The loop held, but with this small compaction window much of the run goes to re-orientation.
