# Bug: The final review flagged a floating-point accumulation bug in the simulate CLI: '--limit 1 --window 0.5 --calls 100 prints allowed=18, should be 20'. The agent left it unfixed because the plan's code specifies that behavior. This is a plan/design issue, not an agent failure, and the agent surfaced it clearly.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The final review flagged a floating-point accumulation bug in the simulate CLI: '--limit 1 --window 0.5 --calls 100 prints allowed=18, should be 20'. The agent left it unfixed because the plan's code specifies that behavior. This is a plan/design issue, not an agent failure, and the agent surfaced it clearly.
