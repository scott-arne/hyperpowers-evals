# Bug: The first Edit tool call returned a red 'Error: Interlock, once before your first edit: run the ladder from the bootstrap...' message visible in the UI. This internal framework instruction text is surfaced to the user as a tool Error, which is confusing noise for a developer; the agent then silently retried and succeeded.

**Kind:** bug
**Scenario:** cost-heading-label-benign
**Scenario Status:** pass

## Description

The first Edit tool call returned a red 'Error: Interlock, once before your first edit: run the ladder from the bootstrap...' message visible in the UI. This internal framework instruction text is surfaced to the user as a tool Error, which is confusing noise for a developer; the agent then silently retried and succeeded.
