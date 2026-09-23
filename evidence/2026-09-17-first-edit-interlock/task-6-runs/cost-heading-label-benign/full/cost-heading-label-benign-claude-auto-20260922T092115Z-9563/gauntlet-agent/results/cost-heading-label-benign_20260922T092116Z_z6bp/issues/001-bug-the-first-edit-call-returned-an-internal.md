# Bug: The first Edit call returned an internal 'Interlock' error message displayed verbatim in the user-facing transcript: 'Error: Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence...'. This framework/instructional text leaking into the user-visible output looks unpolished and confusing for a plain label change; the agent retried and succeeded, but a developer would see a red error block for a change that worked.

**Kind:** bug
**Scenario:** cost-heading-label-benign
**Scenario Status:** pass

## Description

The first Edit call returned an internal 'Interlock' error message displayed verbatim in the user-facing transcript: 'Error: Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence...'. This framework/instructional text leaking into the user-visible output looks unpolished and confusing for a plain label change; the agent retried and succeeded, but a developer would see a red error block for a change that worked.
