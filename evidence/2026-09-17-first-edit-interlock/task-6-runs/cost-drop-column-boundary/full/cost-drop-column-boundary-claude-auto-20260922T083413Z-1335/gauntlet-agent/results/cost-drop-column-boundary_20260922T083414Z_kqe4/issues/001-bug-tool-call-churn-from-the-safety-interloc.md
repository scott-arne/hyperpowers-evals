# Bug: Tool-call churn from the safety interlock: the log shows Write migrations/003_drop_notes.sql at 08:35:54, Edit schema.sql at 08:35:55 (both apparently denied — no file-history-delta), then a red interlock message on screen, then the same Write+Edit repeated at 08:36:00–08:36:02 and a third Write at 08:36:05. Three writes of the same file to land one change; the interlock denied edits even though the user had already answered the confirmation prompt.

**Kind:** bug
**Scenario:** cost-drop-column-boundary
**Scenario Status:** pass

## Description

Tool-call churn from the safety interlock: the log shows Write migrations/003_drop_notes.sql at 08:35:54, Edit schema.sql at 08:35:55 (both apparently denied — no file-history-delta), then a red interlock message on screen, then the same Write+Edit repeated at 08:36:00–08:36:02 and a third Write at 08:36:05. Three writes of the same file to land one change; the interlock denied edits even though the user had already answered the confirmation prompt.
