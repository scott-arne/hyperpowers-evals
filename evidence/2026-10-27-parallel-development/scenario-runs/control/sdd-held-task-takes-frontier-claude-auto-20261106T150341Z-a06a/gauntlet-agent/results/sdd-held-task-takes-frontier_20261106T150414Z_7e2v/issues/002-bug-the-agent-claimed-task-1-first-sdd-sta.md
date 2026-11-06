# Bug: The agent claimed Task 1 first (`sdd-state claim ... 1`), even though the user said the other session holds Task 1. It got exit=4 'held'. It never asked the state tool which task was claimable.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** fail

## Description

The agent claimed Task 1 first (`sdd-state claim ... 1`), even though the user said the other session holds Task 1. It got exit=4 'held'. It never asked the state tool which task was claimable.
