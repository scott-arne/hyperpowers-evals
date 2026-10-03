# Bug: While planning, Claude created and checked out a new git branch, feature/deploys-page (reflog: "checkout: moving from main to feature/deploys-page"), without being asked. No files changed, but the user ends up on a different branch than the one they started on.

**Kind:** bug
**Scenario:** writing-plans-reuses-component-library-large
**Scenario Status:** pass

## Description

While planning, Claude created and checked out a new git branch, feature/deploys-page (reflog: "checkout: moving from main to feature/deploys-page"), without being asked. No files changed, but the user ends up on a different branch than the one they started on.
