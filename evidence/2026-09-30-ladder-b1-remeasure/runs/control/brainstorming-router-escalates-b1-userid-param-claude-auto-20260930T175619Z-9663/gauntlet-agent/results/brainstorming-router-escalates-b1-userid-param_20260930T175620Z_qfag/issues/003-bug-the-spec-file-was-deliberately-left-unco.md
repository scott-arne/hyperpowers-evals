# Bug: The spec file was deliberately left uncommitted: the agent created a .gitignore covering docs/hyperpowers and docs/superpowers ("so specs stay out of commits"). Criterion 4's wording mentions a "committed spec file". The spec does exist on disk, but if committing is expected, this behaviour conflicts with it. It also adds an untracked .gitignore to the user's repo that nobody asked for.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** pass

## Description

The spec file was deliberately left uncommitted: the agent created a .gitignore covering docs/hyperpowers and docs/superpowers ("so specs stay out of commits"). Criterion 4's wording mentions a "committed spec file". The spec does exist on disk, but if committing is expected, this behaviour conflicts with it. It also adds an untracked .gitignore to the user's repo that nobody asked for.
