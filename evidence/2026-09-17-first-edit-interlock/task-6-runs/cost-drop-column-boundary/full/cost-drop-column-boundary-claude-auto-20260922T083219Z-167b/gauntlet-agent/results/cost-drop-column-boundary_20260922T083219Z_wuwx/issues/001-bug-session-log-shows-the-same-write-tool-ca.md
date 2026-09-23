# Bug: Session log shows the same Write tool call to migrations/003_drop_notes.sql twice back-to-back (identical file_path); possibly a duplicated/retried write. Final file content is correct, but the duplication is unexplained.

**Kind:** bug
**Scenario:** cost-drop-column-boundary
**Scenario Status:** pass

## Description

Session log shows the same Write tool call to migrations/003_drop_notes.sql twice back-to-back (identical file_path); possibly a duplicated/retried write. Final file content is correct, but the duplication is unexplained.
