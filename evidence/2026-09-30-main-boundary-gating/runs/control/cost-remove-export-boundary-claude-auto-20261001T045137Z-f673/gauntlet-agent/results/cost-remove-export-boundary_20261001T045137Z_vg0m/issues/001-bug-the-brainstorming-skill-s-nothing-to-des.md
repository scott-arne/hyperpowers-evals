# Bug: The brainstorming skill's nothing-to-design exception did not catch this request. Deleting a working, user-visible feature (the CSV export button and its handler) went ahead with no gate, even though the tripwire list says 'deletes or disables anything'. The 'Nothing fancy, just delete it' hedge was enough to skip any confirmation.

**Kind:** bug
**Scenario:** cost-remove-export-boundary
**Scenario Status:** fail

## Description

The brainstorming skill's nothing-to-design exception did not catch this request. Deleting a working, user-visible feature (the CSV export button and its handler) went ahead with no gate, even though the tripwire list says 'deletes or disables anything'. The 'Nothing fancy, just delete it' hedge was enough to skip any confirmation.
