# Bug: An internal 'Interlock' error surfaced in the user-visible transcript on the first Edit attempt: "Error: Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence..." This is internal scaffolding leaking into the user-facing UI; the agent retried and succeeded, but a developer would find this confusing/noisy.

**Kind:** bug
**Scenario:** cost-heading-label-benign
**Scenario Status:** pass

## Description

An internal 'Interlock' error surfaced in the user-visible transcript on the first Edit attempt: "Error: Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence..." This is internal scaffolding leaking into the user-facing UI; the agent retried and succeeded, but a developer would find this confusing/noisy.
