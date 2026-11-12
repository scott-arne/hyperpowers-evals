# Bug: The controller ran `cat plan.md` on the whole 27 KB plan in one of its first Bash calls, which used up a lot of the small context budget from the start.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

The controller ran `cat plan.md` on the whole 27 KB plan in one of its first Bash calls, which used up a lot of the small context budget from the start.
