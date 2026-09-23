# Bug: The agent's first Edit call returned a red error block on screen: 'Error: Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence beyond the lines you touch...' The agent then simply retried and the second Edit succeeded. This surfaced a raw internal interlock message in the user-visible transcript, which looks like a leaked framework prompt rather than a real tool error.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

The agent's first Edit call returned a red error block on screen: 'Error: Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence beyond the lines you touch...' The agent then simply retried and the second Edit succeeded. This surfaced a raw internal interlock message in the user-visible transcript, which looks like a leaked framework prompt rather than a real tool error.
