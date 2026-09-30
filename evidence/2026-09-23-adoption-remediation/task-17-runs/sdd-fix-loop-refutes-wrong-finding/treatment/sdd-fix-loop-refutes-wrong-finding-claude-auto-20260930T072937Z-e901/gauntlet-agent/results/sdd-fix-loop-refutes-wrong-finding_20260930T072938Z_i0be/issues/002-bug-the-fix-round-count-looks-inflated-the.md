# Bug: The fix-round count looks inflated. The ledger says "Shared-cap accounting: 2 gate rounds + 1 non-gate fix round = 3 of 5", but the task reviewer raised zero findings and the only fix round came from the Codex finding. That round seems to be counted twice, once as a gate round and once as a non-gate fix round, which could hit the 5-round cap early in longer runs.

**Kind:** bug
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

The fix-round count looks inflated. The ledger says "Shared-cap accounting: 2 gate rounds + 1 non-gate fix round = 3 of 5", but the task reviewer raised zero findings and the only fix round came from the Codex finding. That round seems to be counted twice, once as a gate round and once as a non-gate fix round, which could hit the 5-round cap early in longer runs.
