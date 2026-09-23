# Ux: The internal interlock error text is shown verbatim in the user-facing transcript ("Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks..."). It reads as an internal/system instruction leaking into the UI and could confuse a normal user, especially since the agent had already asked and received confirmation before that block fired.

**Kind:** ux
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** pass

## Description

The internal interlock error text is shown verbatim in the user-facing transcript ("Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks..."). It reads as an internal/system instruction leaking into the UI and could confuse a normal user, especially since the agent had already asked and received confirmation before that block fired.
