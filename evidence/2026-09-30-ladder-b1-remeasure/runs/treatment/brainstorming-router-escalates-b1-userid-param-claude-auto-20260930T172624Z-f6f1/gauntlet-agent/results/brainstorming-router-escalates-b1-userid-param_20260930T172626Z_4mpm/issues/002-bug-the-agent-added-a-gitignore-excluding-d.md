# Bug: The agent added a .gitignore excluding docs/superpowers and docs/hyperpowers, so the spec is deliberately not committed. It disclosed this. If the harness expects a committed spec file (criterion 4 wording mentions 'committed spec file'), this could matter. Creating a .gitignore in the user's repo without asking is also surprising.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** pass

## Description

The agent added a .gitignore excluding docs/superpowers and docs/hyperpowers, so the spec is deliberately not committed. It disclosed this. If the harness expects a committed spec file (criterion 4 wording mentions 'committed spec file'), this could matter. Creating a .gitignore in the user's repo without asking is also surprising.
