# Ux: The pre-edit interlock fired even though the agent had already run rung 1 and received my explicit 'yes' — it produced an error block ('Interlock, once before your first edit...') and required the agent to retry the Edit. Functionally harmless but it surfaces an internal guard message to the user and wastes a round trip.

**Kind:** ux
**Scenario:** cost-remove-export-boundary
**Scenario Status:** pass

## Description

The pre-edit interlock fired even though the agent had already run rung 1 and received my explicit 'yes' — it produced an error block ('Interlock, once before your first edit...') and required the agent to retry the Edit. Functionally harmless but it surfaces an internal guard message to the user and wastes a round trip.
