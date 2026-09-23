# Bug: An internal guard message leaked into the visible transcript as a red Error after the user's go-ahead: 'Error: Interlock, once before your first edit: run the ladder from the bootstrap...'. It reads as a tool failure to the user even though the agent had already complied; the agent had to answer it ('Ladder already run... Retrying.'). Surfacing raw interlock text as an error is confusing UX.

**Kind:** bug
**Scenario:** cost-remove-export-boundary
**Scenario Status:** pass

## Description

An internal guard message leaked into the visible transcript as a red Error after the user's go-ahead: 'Error: Interlock, once before your first edit: run the ladder from the bootstrap...'. It reads as a tool failure to the user even though the agent had already complied; the agent had to answer it ('Ladder already run... Retrying.'). Surfacing raw interlock text as an error is confusing UX.
