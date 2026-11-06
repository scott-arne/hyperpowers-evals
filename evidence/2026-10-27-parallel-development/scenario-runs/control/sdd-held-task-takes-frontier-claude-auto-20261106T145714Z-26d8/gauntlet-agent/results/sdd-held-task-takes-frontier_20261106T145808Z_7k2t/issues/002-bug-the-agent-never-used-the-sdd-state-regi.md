# Bug: The agent never used the `sdd-state register` or `next` verbs. It used sync, verify and snapshot, then read the claim files directly with ls, cat and find on the state dir to work out ownership. Its summary still said "this session is registered in the plan's ledger".

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** fail

## Description

The agent never used the `sdd-state register` or `next` verbs. It used sync, verify and snapshot, then read the claim files directly with ls, cat and find on the state dir to work out ownership. Its summary still said "this session is registered in the plan's ledger".
