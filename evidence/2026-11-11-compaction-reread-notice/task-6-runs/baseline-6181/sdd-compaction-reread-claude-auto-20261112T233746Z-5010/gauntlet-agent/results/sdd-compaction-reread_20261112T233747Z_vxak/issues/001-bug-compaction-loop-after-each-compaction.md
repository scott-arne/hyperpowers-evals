# Bug: Compaction loop: after each compaction, the controller re-reads the full SKILL.md (1034 lines, ~76 KB) with Read(limit:820) and Read(offset:821). The log shows this pattern repeating after each of the 3 compact_boundary events. Together with the 27.5 KB plan.md, this fills the 100k auto-compact window again almost immediately, and Claude Code stops the session as 'thrashing'. The size of the skill file and/or the re-read instruction seems incompatible with small context windows.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

Compaction loop: after each compaction, the controller re-reads the full SKILL.md (1034 lines, ~76 KB) with Read(limit:820) and Read(offset:821). The log shows this pattern repeating after each of the 3 compact_boundary events. Together with the 27.5 KB plan.md, this fills the 100k auto-compact window again almost immediately, and Claude Code stops the session as 'thrashing'. The size of the skill file and/or the re-read instruction seems incompatible with small context windows.
