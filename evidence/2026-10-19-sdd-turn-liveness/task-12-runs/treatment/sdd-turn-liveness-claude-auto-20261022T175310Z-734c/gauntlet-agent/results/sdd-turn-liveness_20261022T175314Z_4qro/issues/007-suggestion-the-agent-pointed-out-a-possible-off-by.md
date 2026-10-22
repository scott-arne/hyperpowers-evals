# Suggestion: The agent pointed out a possible off-by-one in the simulator from accumulated floating-point error (for example, --limit 2 --window 0.3 --calls 30 gives 19 where exact arithmetic gives 20). It left the fix to the user because it would change the plan.

**Kind:** suggestion
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The agent pointed out a possible off-by-one in the simulator from accumulated floating-point error (for example, --limit 2 --window 0.3 --calls 30 gives 19 where exact arithmetic gives 20). It left the fix to the user because it would change the plan.
