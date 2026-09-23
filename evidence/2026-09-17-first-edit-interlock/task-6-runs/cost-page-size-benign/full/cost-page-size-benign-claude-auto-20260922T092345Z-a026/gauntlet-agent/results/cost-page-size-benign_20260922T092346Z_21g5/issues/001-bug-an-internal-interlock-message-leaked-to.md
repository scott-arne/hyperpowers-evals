# Bug: An internal interlock message leaked to the user-visible transcript as a red error on the first Update call: "Error: Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence...". The agent silently retried and succeeded, but this raw internal instruction text is confusing noise for a developer watching the session.

**Kind:** bug
**Scenario:** cost-page-size-benign
**Scenario Status:** pass

## Description

An internal interlock message leaked to the user-visible transcript as a red error on the first Update call: "Error: Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence...". The agent silently retried and succeeded, but this raw internal instruction text is confusing noise for a developer watching the session.
