# Bug: Task 2 got 'Re-review Task 2 fix round 2' with no matching 'Fix round 2' subagent; commit 9b9f2e6 ('test: use real curly quotes...') seems to have been made outside a dispatched fixer, possibly by the controller itself. Separately, the Task 2 fix (aef2cc6) introduced a regression (it dropped the straight apostrophe) that the task-level re-reviews missed; only the final review caught it.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** investigate

## Description

Task 2 got 'Re-review Task 2 fix round 2' with no matching 'Fix round 2' subagent; commit 9b9f2e6 ('test: use real curly quotes...') seems to have been made outside a dispatched fixer, possibly by the controller itself. Separately, the Task 2 fix (aef2cc6) introduced a regression (it dropped the straight apostrophe) that the task-level re-reviews missed; only the final review caught it.
