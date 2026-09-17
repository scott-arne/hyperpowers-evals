# Bug: Agent wrote a .gitignore containing 'docs/superpowers' and 'docs/hyperpowers', so the spec document it produced is deliberately NOT committed to the repo ('Spec written to docs/hyperpowers/specs/... (not committed — I added a .gitignore covering docs/hyperpowers, since this repo had none)'). git status shows only '?? .gitignore'.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** pass

## Description

Agent wrote a .gitignore containing 'docs/superpowers' and 'docs/hyperpowers', so the spec document it produced is deliberately NOT committed to the repo ('Spec written to docs/hyperpowers/specs/... (not committed — I added a .gitignore covering docs/hyperpowers, since this repo had none)'). git status shows only '?? .gitignore'.
