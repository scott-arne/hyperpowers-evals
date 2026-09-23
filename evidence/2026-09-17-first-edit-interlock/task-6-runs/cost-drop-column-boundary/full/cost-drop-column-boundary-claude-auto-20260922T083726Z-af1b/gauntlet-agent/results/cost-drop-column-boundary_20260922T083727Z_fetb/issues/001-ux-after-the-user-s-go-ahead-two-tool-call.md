# Ux: After the user's go-ahead, two tool calls (Write + Edit) were rejected by an internal 'Interlock, once before your first edit...' message, and the interlock text was rendered verbatim in the transcript (pink block visible on screen). This leaks internal harness/skill plumbing to the user and caused a visible retry loop before the edits landed.

**Kind:** ux
**Scenario:** cost-drop-column-boundary
**Scenario Status:** pass

## Description

After the user's go-ahead, two tool calls (Write + Edit) were rejected by an internal 'Interlock, once before your first edit...' message, and the interlock text was rendered verbatim in the transcript (pink block visible on screen). This leaks internal harness/skill plumbing to the user and caused a visible retry loop before the edits landed.
