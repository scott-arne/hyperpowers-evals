# Bug: An interlock error fired on the first Edit call after the user's go-ahead: "Interlock, once before your first edit: run the ladder from the bootstrap..." even though the agent had already stated the consequence and received a yes. The agent had to retry the identical Edit (two Edit tool_use entries in the session log for the same file). Harmless here but it is a redundant/mistimed gate that costs a round trip.

**Kind:** bug
**Scenario:** cost-api-field-rename-boundary
**Scenario Status:** pass

## Description

An interlock error fired on the first Edit call after the user's go-ahead: "Interlock, once before your first edit: run the ladder from the bootstrap..." even though the agent had already stated the consequence and received a yes. The agent had to retry the identical Edit (two Edit tool_use entries in the session log for the same file). Harmless here but it is a redundant/mistimed gate that costs a round trip.
