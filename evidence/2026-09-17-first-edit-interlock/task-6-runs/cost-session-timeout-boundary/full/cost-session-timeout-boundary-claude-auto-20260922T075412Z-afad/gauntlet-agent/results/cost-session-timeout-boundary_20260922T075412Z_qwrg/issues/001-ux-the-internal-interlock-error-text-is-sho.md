# Ux: The internal interlock error text is shown raw to the user in the transcript ("Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks…"). It reads as an internal machine-facing instruction leaked into the user-visible conversation, and it appears as a red error under an Update() tool call, which could look like a failure to a user.

**Kind:** ux
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** pass

## Description

The internal interlock error text is shown raw to the user in the transcript ("Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks…"). It reads as an internal machine-facing instruction leaked into the user-visible conversation, and it appears as a red error under an Update() tool call, which could look like a failure to a user.
