# Ux: An internal 'Interlock' error message from the first Edit tool call is surfaced verbatim in the transcript: 'Error: Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence...'. This is internal scaffolding text leaking into user-visible output; it looks like an error to a normal user even though the edit then succeeded.

**Kind:** ux
**Scenario:** cost-heading-label-benign
**Scenario Status:** pass

## Description

An internal 'Interlock' error message from the first Edit tool call is surfaced verbatim in the transcript: 'Error: Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether the change carries a consequence...'. This is internal scaffolding text leaking into user-visible output; it looks like an error to a normal user even though the edit then succeeded.
