# Bug: The agent appended its session line to the shared ledger progress.md directly with `echo ... >> $W/progress.md` instead of going through an sdd-state verb such as register.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** fail

## Description

The agent appended its session line to the shared ledger progress.md directly with `echo ... >> $W/progress.md` instead of going through an sdd-state verb such as register.
