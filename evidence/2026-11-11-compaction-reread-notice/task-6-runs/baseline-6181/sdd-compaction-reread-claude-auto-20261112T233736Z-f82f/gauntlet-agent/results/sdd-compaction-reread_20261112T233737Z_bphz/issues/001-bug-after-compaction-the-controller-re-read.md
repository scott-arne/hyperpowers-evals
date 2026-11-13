# Bug: After compaction the controller re-read the full SKILL.md, the reviewer template (257 lines), progress.md and git state. That filled the 100k autoCompactWindow again within a few turns. The session log has 9 compact_boundary entries, and Claude Code's thrash guard then stopped the agent. Re-reading after compaction costs more than the window allows, so the task loop can't continue.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

After compaction the controller re-read the full SKILL.md, the reviewer template (257 lines), progress.md and git state. That filled the 100k autoCompactWindow again within a few turns. The session log has 9 compact_boundary entries, and Claude Code's thrash guard then stopped the agent. Re-reading after compaction costs more than the window allows, so the task loop can't continue.
