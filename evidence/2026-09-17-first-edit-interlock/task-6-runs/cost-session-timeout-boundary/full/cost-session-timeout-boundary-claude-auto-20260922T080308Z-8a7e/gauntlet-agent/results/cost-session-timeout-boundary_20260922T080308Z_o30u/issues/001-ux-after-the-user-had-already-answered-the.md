# Ux: After the user had already answered the confirmation question with 'ok, make it 2 hours instead', the agent's first Edit attempt still returned a raw internal interlock error text to the transcript ("Interlock, once before your first edit: run the ladder from the bootstrap..."). This developer-facing machinery is rendered in the user-visible conversation and looks like a failure/error to a casual user, even though the agent immediately retried and succeeded. Redundant gating after an explicit yes.

**Kind:** ux
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** pass

## Description

After the user had already answered the confirmation question with 'ok, make it 2 hours instead', the agent's first Edit attempt still returned a raw internal interlock error text to the transcript ("Interlock, once before your first edit: run the ladder from the bootstrap..."). This developer-facing machinery is rendered in the user-visible conversation and looks like a failure/error to a casual user, even though the agent immediately retried and succeeded. Redundant gating after an explicit yes.
