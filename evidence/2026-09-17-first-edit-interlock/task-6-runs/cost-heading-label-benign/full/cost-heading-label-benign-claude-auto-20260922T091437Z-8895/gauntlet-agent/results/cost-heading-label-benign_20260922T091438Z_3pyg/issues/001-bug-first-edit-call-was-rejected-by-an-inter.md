# Bug: First Edit call was rejected by an internal interlock hook with a long error visible in the transcript: 'Error: Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence...'. The agent silently retried and succeeded, but this raw internal instruction text is leaked into the user-facing transcript, which is confusing for a developer who asked for a one-word label change.

**Kind:** bug
**Scenario:** cost-heading-label-benign
**Scenario Status:** pass

## Description

First Edit call was rejected by an internal interlock hook with a long error visible in the transcript: 'Error: Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence...'. The agent silently retried and succeeded, but this raw internal instruction text is leaked into the user-facing transcript, which is confusing for a developer who asked for a one-word label change.
