# Bug: SDD skipped `sdd-state next` and went straight to claiming Task 1, the first task, without checking which tasks were claimable. The claim script refused it (`status=held`, exit 4).

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** fail

## Description

SDD skipped `sdd-state next` and went straight to claiming Task 1, the first task, without checking which tasks were claimable. The claim script refused it (`status=held`, exit 4).
