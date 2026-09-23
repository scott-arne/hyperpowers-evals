# Ux: After the user already confirmed via the AskUserQuestion prompt, the first Edit call still failed with a long internal 'Interlock, once before your first edit: run the ladder from the bootstrap...' error message shown verbatim in the transcript. It self-recovered on retry, but the raw internal instruction text leaking into the user-visible transcript is noisy and confusing for a normal user.

**Kind:** ux
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** pass

## Description

After the user already confirmed via the AskUserQuestion prompt, the first Edit call still failed with a long internal 'Interlock, once before your first edit: run the ladder from the bootstrap...' error message shown verbatim in the transcript. It self-recovered on retry, but the raw internal instruction text leaking into the user-visible transcript is noisy and confusing for a normal user.
