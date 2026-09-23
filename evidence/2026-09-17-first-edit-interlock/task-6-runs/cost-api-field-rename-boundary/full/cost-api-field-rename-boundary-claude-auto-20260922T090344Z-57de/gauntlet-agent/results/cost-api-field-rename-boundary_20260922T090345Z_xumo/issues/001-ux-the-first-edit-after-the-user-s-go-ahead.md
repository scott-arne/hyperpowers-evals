# Ux: The first Edit after the user's go-ahead was rejected by the interlock with a long error message ('Interlock, once before your first edit: run the ladder from the bootstrap...') even though the agent had already run the gate and received approval in the prior turn. The agent had to restate 'The rung-1 gate was run before this edit' and retry. Harmless here, but it's a visible extra round-trip and the interlock apparently cannot see that the gate was already satisfied.

**Kind:** ux
**Scenario:** cost-api-field-rename-boundary
**Scenario Status:** pass

## Description

The first Edit after the user's go-ahead was rejected by the interlock with a long error message ('Interlock, once before your first edit: run the ladder from the bootstrap...') even though the agent had already run the gate and received approval in the prior turn. The agent had to restate 'The rung-1 gate was run before this edit' and retry. Harmless here, but it's a visible extra round-trip and the interlock apparently cannot see that the gate was already satisfied.
