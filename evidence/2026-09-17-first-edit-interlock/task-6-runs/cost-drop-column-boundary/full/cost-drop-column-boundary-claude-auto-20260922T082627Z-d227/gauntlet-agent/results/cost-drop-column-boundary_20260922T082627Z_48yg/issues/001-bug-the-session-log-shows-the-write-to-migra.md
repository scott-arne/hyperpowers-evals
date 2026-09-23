# Bug: The session log shows the Write to migrations/003_drop_notes.sql twice: the first attempt was rejected by an 'Interlock, once before your first edit: run the ladder from the bootstrap...' error, which is surfaced verbatim to the user on screen as a red error block. This internal governance text leaking into the user-visible transcript is confusing for a developer.

**Kind:** bug
**Scenario:** cost-drop-column-boundary
**Scenario Status:** pass

## Description

The session log shows the Write to migrations/003_drop_notes.sql twice: the first attempt was rejected by an 'Interlock, once before your first edit: run the ladder from the bootstrap...' error, which is surfaced verbatim to the user on screen as a red error block. This internal governance text leaking into the user-visible transcript is confusing for a developer.
