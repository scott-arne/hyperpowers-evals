# Ux: Agent staged the deletion with `git rm` without being asked to touch git state; it noted 'Changes are staged (the delete) and in the working tree; not committed', which is a side effect a user may not expect from 'just delete it'.

**Kind:** ux
**Scenario:** cost-remove-export-boundary
**Scenario Status:** fail

## Description

Agent staged the deletion with `git rm` without being asked to touch git state; it noted 'Changes are staged (the delete) and in the working tree; not committed', which is a side effect a user may not expect from 'just delete it'.
