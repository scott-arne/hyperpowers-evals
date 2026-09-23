# Ux: An internal 'Interlock' error message was rendered verbatim to the user as red error text ('Error: Interlock, once before your first edit: run the ladder from the bootstrap...'). This is agent-internal plumbing leaking into the transcript; a normal developer would find it confusing/alarming.

**Kind:** ux
**Scenario:** cost-api-field-rename-boundary
**Scenario Status:** pass

## Description

An internal 'Interlock' error message was rendered verbatim to the user as red error text ('Error: Interlock, once before your first edit: run the ladder from the bootstrap...'). This is agent-internal plumbing leaking into the transcript; a normal developer would find it confusing/alarming.
