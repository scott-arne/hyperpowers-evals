# Bug: Compaction hit before Task 1 started, during setup (worktree decision, ledger creation, pre-flight conflict scan), not after the first task as the scenario intended. The setup phase alone (skill load + plan + ledger + scan) uses most of a 100k window.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

Compaction hit before Task 1 started, during setup (worktree decision, ledger creation, pre-flight conflict scan), not after the first task as the scenario intended. The setup phase alone (skill load + plan + ledger + scan) uses most of a 100k window.
