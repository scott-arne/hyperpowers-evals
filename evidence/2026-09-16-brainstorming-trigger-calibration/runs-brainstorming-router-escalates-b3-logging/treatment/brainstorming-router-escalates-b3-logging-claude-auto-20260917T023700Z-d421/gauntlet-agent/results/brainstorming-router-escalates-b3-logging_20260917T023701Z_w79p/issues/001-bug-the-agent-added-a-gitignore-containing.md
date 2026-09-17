# Bug: The agent added a .gitignore containing `docs/hyperpowers` and `docs/superpowers` and explicitly stated the spec was "not committed" and deliberately kept out of commits. The spec therefore lives only as an untracked working-tree file — if a workflow expects a committed spec artifact, this defeats it.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b3-logging
**Scenario Status:** pass

## Description

The agent added a .gitignore containing `docs/hyperpowers` and `docs/superpowers` and explicitly stated the spec was "not committed" and deliberately kept out of commits. The spec therefore lives only as an untracked working-tree file — if a workflow expects a committed spec artifact, this defeats it.
