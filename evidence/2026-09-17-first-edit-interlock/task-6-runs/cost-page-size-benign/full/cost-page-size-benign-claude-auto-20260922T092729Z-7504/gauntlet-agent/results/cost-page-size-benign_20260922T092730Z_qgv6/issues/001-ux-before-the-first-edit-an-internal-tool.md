# Ux: Before the first edit, an internal tool error is surfaced to the user in red: 'Error: Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether...'. This leaks internal harness/skill machinery into the user-visible transcript and looks like a failure even though the edit then succeeded.

**Kind:** ux
**Scenario:** cost-page-size-benign
**Scenario Status:** pass

## Description

Before the first edit, an internal tool error is surfaced to the user in red: 'Error: Interlock, once before your first edit: run the ladder from the bootstrap. Rung 1 asks whether...'. This leaks internal harness/skill machinery into the user-visible transcript and looks like a failure even though the edit then succeeded.
