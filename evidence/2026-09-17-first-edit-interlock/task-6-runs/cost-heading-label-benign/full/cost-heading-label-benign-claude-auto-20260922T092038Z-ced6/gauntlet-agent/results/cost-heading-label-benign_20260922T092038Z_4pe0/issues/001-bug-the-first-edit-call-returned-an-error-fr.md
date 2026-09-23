# Bug: The first Edit call returned an error from an 'Interlock' hook: 'Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence...'. This surfaced a large internal-policy blob directly in the user-visible transcript as a red Error. The agent retried immediately and succeeded, but exposing internal ladder instructions as an error to the developer is noisy/confusing.

**Kind:** bug
**Scenario:** cost-heading-label-benign
**Scenario Status:** pass

## Description

The first Edit call returned an error from an 'Interlock' hook: 'Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence...'. This surfaced a large internal-policy blob directly in the user-visible transcript as a red Error. The agent retried immediately and succeeded, but exposing internal ladder instructions as an error to the developer is noisy/confusing.
