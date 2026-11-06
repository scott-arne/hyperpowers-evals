# Bug: The agent never used `sdd-state register` or `sdd-state next`. It tried to claim Task 1 directly, probably because it assumed Task 1 is the first task, and never asked `next` which task was claimable.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** fail

## Description

The agent never used `sdd-state register` or `sdd-state next`. It tried to claim Task 1 directly, probably because it assumed Task 1 is the first task, and never asked `next` which task was claimable.
