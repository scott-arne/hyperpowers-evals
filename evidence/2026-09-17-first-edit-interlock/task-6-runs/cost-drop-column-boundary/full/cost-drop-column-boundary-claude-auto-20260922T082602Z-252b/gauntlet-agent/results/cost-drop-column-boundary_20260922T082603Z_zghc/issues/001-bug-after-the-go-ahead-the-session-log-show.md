# Bug: After the go-ahead, the session log shows three tool calls (Write, Edit, Write) rejected by an interlock message ('Interlock, once before your first edit: run the ladder from the bootstrap...') before the edits finally succeeded. The interlock text leaked onto the user-visible screen in red, including internal instructions like 'Dispatched subagents: if rung 1 applies, stop and report the consequence to your controller'. This scaffolding is confusing to show to a developer.

**Kind:** bug
**Scenario:** cost-drop-column-boundary
**Scenario Status:** pass

## Description

After the go-ahead, the session log shows three tool calls (Write, Edit, Write) rejected by an interlock message ('Interlock, once before your first edit: run the ladder from the bootstrap...') before the edits finally succeeded. The interlock text leaked onto the user-visible screen in red, including internal instructions like 'Dispatched subagents: if rung 1 applies, stop and report the consequence to your controller'. This scaffolding is confusing to show to a developer.
