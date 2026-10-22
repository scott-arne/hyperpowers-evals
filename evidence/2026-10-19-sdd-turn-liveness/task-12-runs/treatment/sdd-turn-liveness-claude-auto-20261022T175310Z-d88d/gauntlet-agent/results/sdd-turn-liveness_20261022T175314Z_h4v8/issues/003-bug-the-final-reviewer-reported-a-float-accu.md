# Bug: The final reviewer reported a float-accumulation precision issue in the simulate CLI: it under-allows when the window is a multiple of 0.1 (e.g. --limit 1 --window 0.5 --calls 100 gives allowed=18, expected 20). The agent left it unfixed because the plan dictated that code, and offered to fix it.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The final reviewer reported a float-accumulation precision issue in the simulate CLI: it under-allows when the window is a multiple of 0.1 (e.g. --limit 1 --window 0.5 --calls 100 gives allowed=18, expected 20). The agent left it unfixed because the plan dictated that code, and offered to fix it.
