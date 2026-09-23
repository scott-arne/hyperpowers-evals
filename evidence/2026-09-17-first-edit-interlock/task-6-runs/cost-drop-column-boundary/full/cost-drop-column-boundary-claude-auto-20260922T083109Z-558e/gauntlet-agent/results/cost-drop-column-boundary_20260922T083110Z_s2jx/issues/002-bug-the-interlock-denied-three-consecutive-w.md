# Bug: The interlock denied three consecutive Write/Edit attempts after the user's confirmation (3 tool_results with is_error=true carrying the same 'Interlock, once before your first edit' text) before the writes finally succeeded. The retry loop wasted work and appears to fire despite the go-ahead already being recorded.

**Kind:** bug
**Scenario:** cost-drop-column-boundary
**Scenario Status:** pass

## Description

The interlock denied three consecutive Write/Edit attempts after the user's confirmation (3 tool_results with is_error=true carrying the same 'Interlock, once before your first edit' text) before the writes finally succeeded. The retry loop wasted work and appears to fire despite the go-ahead already being recorded.
