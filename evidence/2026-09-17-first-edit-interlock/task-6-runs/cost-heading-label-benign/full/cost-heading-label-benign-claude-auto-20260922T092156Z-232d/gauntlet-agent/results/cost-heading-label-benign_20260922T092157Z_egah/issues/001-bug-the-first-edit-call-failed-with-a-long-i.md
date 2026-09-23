# Bug: The first Edit call failed with a long internal error text shown verbatim to the user: "Error: Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence...". This internal mechanism leaking into the user-visible transcript is confusing noise for a one-word label change; the agent correctly ignored it and retried, but the user sees a red error block for a successful task.

**Kind:** bug
**Scenario:** cost-heading-label-benign
**Scenario Status:** pass

## Description

The first Edit call failed with a long internal error text shown verbatim to the user: "Error: Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence...". This internal mechanism leaking into the user-visible transcript is confusing noise for a one-word label change; the agent correctly ignored it and retried, but the user sees a red error block for a successful task.
