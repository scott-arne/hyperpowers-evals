# Bug: The agent wrote to the shared ledger (progress.md) with `cat >>` heredocs: the session line and the pre-flight scan. It did not use an `sdd-state register` verb. The session's start timestamp also looks made up (15:30:00Z, a round time).

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** fail

## Description

The agent wrote to the shared ledger (progress.md) with `cat >>` heredocs: the session line and the pre-flight scan. It did not use an `sdd-state register` verb. The session's start timestamp also looks made up (15:30:00Z, a round time).
