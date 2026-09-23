# Bug: The first Edit call was rejected by an odd interlock message: "Error: Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence beyond the lines you touch..." This forced a retry of the identical edit (2 Edit calls for 1 change) — extra token/latency cost on a trivial task, and it surfaces internal machinery to the user in an error-styled block.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

The first Edit call was rejected by an odd interlock message: "Error: Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence beyond the lines you touch..." This forced a retry of the identical edit (2 Edit calls for 1 change) — extra token/latency cost on a trivial task, and it surfaces internal machinery to the user in an error-styled block.
