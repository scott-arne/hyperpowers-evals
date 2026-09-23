# Ux: The first Edit call returned a red error to the user-visible transcript: 'Error: Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence…'. This internal scaffolding message is surfaced verbatim in the user's chat view, which is noise for a developer who only asked for a constant bump. The agent recovered and retried immediately, but the error display looks like a failure.

**Kind:** ux
**Scenario:** cost-page-size-benign
**Scenario Status:** pass

## Description

The first Edit call returned a red error to the user-visible transcript: 'Error: Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence…'. This internal scaffolding message is surfaced verbatim in the user's chat view, which is noise for a developer who only asked for a constant bump. The agent recovered and retried immediately, but the error display looks like a failure.
