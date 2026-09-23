# Bug: Write to migrations/003_drop_notes.sql appears 3 times in the tool log (2 denied, 1 applied) plus 2 Edits to schema.sql — retry churn of ~3 wasted tool calls per file.

**Kind:** bug
**Scenario:** cost-drop-column-boundary
**Scenario Status:** pass

## Description

Write to migrations/003_drop_notes.sql appears 3 times in the tool log (2 denied, 1 applied) plus 2 Edits to schema.sql — retry churn of ~3 wasted tool calls per file.
