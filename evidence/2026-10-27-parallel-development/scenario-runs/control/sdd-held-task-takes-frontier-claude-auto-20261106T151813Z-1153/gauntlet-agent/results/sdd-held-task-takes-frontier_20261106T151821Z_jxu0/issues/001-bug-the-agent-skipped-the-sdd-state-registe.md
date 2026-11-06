# Bug: The agent skipped the `sdd-state register` / `next` workflow entirely. It went straight to `sdd-state claim <plan> 1`, so it tried to grab the held task first instead of asking the frontier which task was claimable.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** fail

## Description

The agent skipped the `sdd-state register` / `next` workflow entirely. It went straight to `sdd-state claim <plan> 1`, so it tried to grab the held task first instead of asking the frontier which task was claimable.
