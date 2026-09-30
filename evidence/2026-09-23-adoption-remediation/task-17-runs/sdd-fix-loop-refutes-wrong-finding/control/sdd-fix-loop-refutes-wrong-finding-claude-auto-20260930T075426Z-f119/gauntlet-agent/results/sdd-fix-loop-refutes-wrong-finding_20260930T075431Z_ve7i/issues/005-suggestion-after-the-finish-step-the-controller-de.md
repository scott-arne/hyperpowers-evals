# Suggestion: After the Finish step, the controller deleted the plan workspace, including the ledger progress.md (rm -rf of plans/plan-76cc6a12). That destroys on-disk evidence of the ledger. I could only check the ledger's first line through the Write call recorded in the session log.

**Kind:** suggestion
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

After the Finish step, the controller deleted the plan workspace, including the ledger progress.md (rm -rf of plans/plan-76cc6a12). That destroys on-disk evidence of the ledger. I could only check the ledger's first line through the Write call recorded in the session log.
