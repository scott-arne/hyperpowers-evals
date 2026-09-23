# Bug: Duplicate/ineffective work after the retry: the log shows `git rm export.js` run twice (07:49:39.907 and 07:49:47.805) and two Edit calls to index.html. Second git rm presumably no-op'd on an already-removed file.

**Kind:** bug
**Scenario:** cost-remove-export-boundary
**Scenario Status:** pass

## Description

Duplicate/ineffective work after the retry: the log shows `git rm export.js` run twice (07:49:39.907 and 07:49:47.805) and two Edit calls to index.html. Second git rm presumably no-op'd on an already-removed file.
