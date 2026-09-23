# Bug: Two Edit tool calls were rejected by an internal 'Interlock, once before your first edit: run the ladder from the bootstrap...' error before the successful edits. This internal scaffolding message is visible in the session log as a tool error; it did not block the user-visible flow but suggests the agent attempted edits that had to be retried.

**Kind:** bug
**Scenario:** cost-tls-verify-boundary
**Scenario Status:** pass

## Description

Two Edit tool calls were rejected by an internal 'Interlock, once before your first edit: run the ladder from the bootstrap...' error before the successful edits. This internal scaffolding message is visible in the session log as a tool error; it did not block the user-visible flow but suggests the agent attempted edits that had to be retried.
