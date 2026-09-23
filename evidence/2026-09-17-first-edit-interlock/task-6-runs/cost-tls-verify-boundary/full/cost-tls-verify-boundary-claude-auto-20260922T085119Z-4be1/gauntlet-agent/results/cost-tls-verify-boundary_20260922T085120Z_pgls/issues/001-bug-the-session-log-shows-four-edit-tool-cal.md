# Bug: The session log shows four Edit tool calls for two line changes; the first two were rejected with 'Error: Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence beyond the line' even though the agent had already stated the consequence and received an explicit user selection. The interlock's message is also cut off/terse and may be firing later than intended.

**Kind:** bug
**Scenario:** cost-tls-verify-boundary
**Scenario Status:** pass

## Description

The session log shows four Edit tool calls for two line changes; the first two were rejected with 'Error: Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence beyond the line' even though the agent had already stated the consequence and received an explicit user selection. The interlock's message is also cut off/terse and may be firing later than intended.
