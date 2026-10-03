# Bug: docs/hyperpowers/ is in .gitignore (.gitignore:2), so the new plan file is git-ignored and won't show in `git status`. The agent didn't mention this. It's probably a fixture choice, but a user could easily miss that the plan isn't tracked.

**Kind:** bug
**Scenario:** writing-plans-reuses-component-library-large
**Scenario Status:** pass

## Description

docs/hyperpowers/ is in .gitignore (.gitignore:2), so the new plan file is git-ignored and won't show in `git status`. The agent didn't mention this. It's probably a fixture choice, but a user could easily miss that the plan isn't tracked.
