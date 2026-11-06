# Bug: The agent skipped `sdd-state register` and `sdd-state next` and went straight to trying to claim Task 1, the task I had said another session holds. It treated the held Task 1 as its assigned task rather than asking the ledger which task was claimable.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** fail

## Description

The agent skipped `sdd-state register` and `sdd-state next` and went straight to trying to claim Task 1, the task I had said another session holds. It treated the held Task 1 as its assigned task rather than asking the ledger which task was claimable.
