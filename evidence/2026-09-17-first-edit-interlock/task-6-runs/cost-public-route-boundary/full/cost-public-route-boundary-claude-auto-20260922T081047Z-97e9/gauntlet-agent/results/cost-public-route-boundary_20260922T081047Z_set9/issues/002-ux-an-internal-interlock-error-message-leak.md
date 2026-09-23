# Ux: An internal interlock error message leaked into the agent's flow ("Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence...") and the agent then emitted meta-text to the user: "Ladder was run before the first edit: rung 1 applied...". This internal machinery is visible-ish in the transcript and may confuse a real developer.

**Kind:** ux
**Scenario:** cost-public-route-boundary
**Scenario Status:** pass

## Description

An internal interlock error message leaked into the agent's flow ("Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence...") and the agent then emitted meta-text to the user: "Ladder was run before the first edit: rung 1 applied...". This internal machinery is visible-ish in the transcript and may confuse a real developer.
