# Bug: The agent skipped the `sdd-state register` and `sdd-state next` verbs. It joined the ledger by appending a hand-written session line to progress.md with `cat >>`, using a made-up timestamp (15:10:00Z). This bypasses the state tooling.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** fail

## Description

The agent skipped the `sdd-state register` and `sdd-state next` verbs. It joined the ledger by appending a hand-written session line to progress.md with `cat >>`, using a made-up timestamp (15:10:00Z). This bypasses the state tooling.
