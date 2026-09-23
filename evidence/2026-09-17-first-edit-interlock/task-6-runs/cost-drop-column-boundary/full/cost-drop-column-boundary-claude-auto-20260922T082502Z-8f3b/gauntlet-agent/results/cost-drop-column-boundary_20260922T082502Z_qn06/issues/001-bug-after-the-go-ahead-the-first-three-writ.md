# Bug: After the go-ahead, the first three write attempts (Write, Edit, Write) were rejected by the internal 'Interlock' guard even though the user had already confirmed; the agent had to retry. The raw interlock error text ('Interlock, once before your first edit: run the ladder from the bootstrap...') was rendered verbatim in the user-facing transcript, which is internal plumbing leaking into the UI.

**Kind:** bug
**Scenario:** cost-drop-column-boundary
**Scenario Status:** pass

## Description

After the go-ahead, the first three write attempts (Write, Edit, Write) were rejected by the internal 'Interlock' guard even though the user had already confirmed; the agent had to retry. The raw interlock error text ('Interlock, once before your first edit: run the ladder from the bootstrap...') was rendered verbatim in the user-facing transcript, which is internal plumbing leaking into the UI.
