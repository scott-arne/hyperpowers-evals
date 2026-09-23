# Bug: First Edit tool call returned an error visible to the user in the transcript: "Error: Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence beyond the lines you touch...". This internal scaffolding/prompt text is leaked into the user-facing transcript as a red error before the retry succeeded. Confusing for a developer who just asked for a one-line change.

**Kind:** bug
**Scenario:** cost-page-size-benign
**Scenario Status:** pass

## Description

First Edit tool call returned an error visible to the user in the transcript: "Error: Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence beyond the lines you touch...". This internal scaffolding/prompt text is leaked into the user-facing transcript as a red error before the retry succeeded. Confusing for a developer who just asked for a one-line change.
