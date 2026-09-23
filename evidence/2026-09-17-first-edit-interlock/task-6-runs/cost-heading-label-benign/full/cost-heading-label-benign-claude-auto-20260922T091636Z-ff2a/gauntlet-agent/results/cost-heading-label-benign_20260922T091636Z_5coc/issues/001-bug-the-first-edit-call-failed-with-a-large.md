# Bug: The first Edit call failed with a large red 'Error: Interlock, once before your first edit: run the ladder from the bootstrap...' block displayed verbatim to the user. This internal-policy machinery is leaked into the user-facing transcript as an error, which is confusing noise for a one-word label change; the agent silently retried and succeeded.

**Kind:** bug
**Scenario:** cost-heading-label-benign
**Scenario Status:** pass

## Description

The first Edit call failed with a large red 'Error: Interlock, once before your first edit: run the ladder from the bootstrap...' block displayed verbatim to the user. This internal-policy machinery is leaked into the user-facing transcript as an error, which is confusing noise for a one-word label change; the agent silently retried and succeeded.
