# Bug: Instead of committing the spec, the agent created a new .gitignore that excludes docs/superpowers and docs/hyperpowers. The spec now lives only on disk, and the agent added an untracked .gitignore to the user's repo without asking.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** investigate

## Description

Instead of committing the spec, the agent created a new .gitignore that excludes docs/superpowers and docs/hyperpowers. The spec now lives only on disk, and the agent added an untracked .gitignore to the user's repo without asking.
