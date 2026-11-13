# Bug: Compaction started before Task 1, not after it as the story expected. The cause was the initial `cat plan.md` (649 lines), a pre-flight scan, and the skill load. The first compaction hit while the controller was still re-checking scan findings in the plan.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

Compaction started before Task 1, not after it as the story expected. The cause was the initial `cat plan.md` (649 lines), a pre-flight scan, and the skill load. The first compaction hit while the controller was still re-checking scan findings in the plan.
