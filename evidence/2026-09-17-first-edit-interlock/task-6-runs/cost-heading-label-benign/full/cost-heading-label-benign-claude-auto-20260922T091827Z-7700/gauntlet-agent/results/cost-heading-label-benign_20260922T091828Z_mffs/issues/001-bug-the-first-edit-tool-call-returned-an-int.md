# Bug: The first Edit tool call returned an internal error message visible to the user: 'Error: Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence...' This framework/interlock plumbing is leaked to the end user in the transcript; the agent silently retried and succeeded. Confusing noise for a plain label change.

**Kind:** bug
**Scenario:** cost-heading-label-benign
**Scenario Status:** pass

## Description

The first Edit tool call returned an internal error message visible to the user: 'Error: Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence...' This framework/interlock plumbing is leaked to the end user in the transcript; the agent silently retried and succeeded. Confusing noise for a plain label change.
