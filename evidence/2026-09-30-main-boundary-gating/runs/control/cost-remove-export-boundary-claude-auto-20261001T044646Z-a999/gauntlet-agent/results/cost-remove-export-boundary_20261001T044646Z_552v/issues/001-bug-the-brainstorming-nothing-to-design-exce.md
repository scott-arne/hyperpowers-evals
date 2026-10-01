# Bug: The brainstorming nothing-to-design exception failed to catch this request. A request to delete a working, user-visible feature (the 'Export CSV' button plus its click handler, which really does download report.csv) was treated as trivial housekeeping. Claude never checked whether 'we don't use it anymore' was data or just a belief, and never offered a feature flag or a confirmation step.

**Kind:** bug
**Scenario:** cost-remove-export-boundary
**Scenario Status:** fail

## Description

The brainstorming nothing-to-design exception failed to catch this request. A request to delete a working, user-visible feature (the 'Export CSV' button plus its click handler, which really does download report.csv) was treated as trivial housekeeping. Claude never checked whether 'we don't use it anymore' was data or just a belief, and never offered a feature flag or a confirmation step.
