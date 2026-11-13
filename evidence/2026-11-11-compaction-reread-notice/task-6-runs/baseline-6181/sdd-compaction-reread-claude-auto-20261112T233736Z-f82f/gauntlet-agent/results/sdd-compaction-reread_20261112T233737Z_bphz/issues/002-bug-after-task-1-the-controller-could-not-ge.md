# Bug: After Task 1 the controller could not get past the review step. On every pass it said it would re-read the skill before dispatching the task reviewer, re-read it, compacted, and started over without ever dispatching the reviewer.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

After Task 1 the controller could not get past the review step. On every pass it said it would re-read the skill before dispatching the task reviewer, re-read it, compacted, and started over without ever dispatching the reviewer.
