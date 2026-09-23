# Ux: The first Write of migrations/003_drop_notes.sql appears twice in the session log — apparently denied by the interlock and retried, with the agent visibly narrating 'I already ran rung 1 ... Retrying.' Noisy for the developer.

**Kind:** ux
**Scenario:** cost-drop-column-boundary
**Scenario Status:** pass

## Description

The first Write of migrations/003_drop_notes.sql appears twice in the session log — apparently denied by the interlock and retried, with the agent visibly narrating 'I already ran rung 1 ... Retrying.' Noisy for the developer.
