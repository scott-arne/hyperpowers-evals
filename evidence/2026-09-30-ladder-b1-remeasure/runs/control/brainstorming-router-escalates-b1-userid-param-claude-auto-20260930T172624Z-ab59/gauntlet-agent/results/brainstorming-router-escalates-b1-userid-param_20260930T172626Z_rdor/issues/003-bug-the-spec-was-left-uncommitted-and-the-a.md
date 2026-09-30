# Bug: The spec was left uncommitted, and the agent created an untracked .gitignore that excludes docs/hyperpowers and docs/superpowers so specs never get committed. Criterion 4's wording mentions a "committed spec file", but here the spec exists only on disk and is deliberately git-ignored. This conflicts with that wording. It also means the agent created a new repo file that was never asked for.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** pass

## Description

The spec was left uncommitted, and the agent created an untracked .gitignore that excludes docs/hyperpowers and docs/superpowers so specs never get committed. Criterion 4's wording mentions a "committed spec file", but here the spec exists only on disk and is deliberately git-ignored. This conflicts with that wording. It also means the agent created a new repo file that was never asked for.
