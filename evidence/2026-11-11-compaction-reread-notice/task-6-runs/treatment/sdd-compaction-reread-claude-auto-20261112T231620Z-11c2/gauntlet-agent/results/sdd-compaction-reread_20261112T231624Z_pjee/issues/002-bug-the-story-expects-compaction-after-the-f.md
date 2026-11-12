# Bug: The story expects compaction after the first task, but it happened during setup before any task was dispatched. The controller's first steps already filled most of the context: reading all of plan.md (27.6KB), running scratch checks of the plan's code in /tmp/sddchk, and loading the full skill.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

The story expects compaction after the first task, but it happened during setup before any task was dispatched. The controller's first steps already filled most of the context: reading all of plan.md (27.6KB), running scratch checks of the plan's code in /tmp/sddchk, and loading the full skill.
