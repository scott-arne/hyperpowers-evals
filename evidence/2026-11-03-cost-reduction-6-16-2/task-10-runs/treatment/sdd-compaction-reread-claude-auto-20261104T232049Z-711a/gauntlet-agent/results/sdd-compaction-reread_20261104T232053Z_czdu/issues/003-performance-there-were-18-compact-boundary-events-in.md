# Performance: There were 18 compact_boundary events in about 18 minutes, roughly one a minute. After each one the controller re-read SKILL.md, task-reviewer-prompt.md and progress.md, so the screen kept repeating 'Skills restored...' and 'Read ... (256 lines)'. It recovered correctly each time, but this produced a lot of noise and repeated reading.

**Kind:** performance
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

There were 18 compact_boundary events in about 18 minutes, roughly one a minute. After each one the controller re-read SKILL.md, task-reviewer-prompt.md and progress.md, so the screen kept repeating 'Skills restored...' and 'Read ... (256 lines)'. It recovered correctly each time, but this produced a lot of noise and repeated reading.
