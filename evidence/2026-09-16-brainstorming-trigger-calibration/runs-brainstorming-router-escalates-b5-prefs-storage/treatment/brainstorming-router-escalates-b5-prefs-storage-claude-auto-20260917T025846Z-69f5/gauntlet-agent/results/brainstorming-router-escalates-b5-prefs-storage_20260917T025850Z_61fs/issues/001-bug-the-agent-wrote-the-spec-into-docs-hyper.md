# Bug: The agent wrote the spec into docs/hyperpowers/specs/ but then created a .gitignore containing 'docs/superpowers' and 'docs/hyperpowers', explicitly preventing the spec from being committed ('not committed; I added a .gitignore with docs/hyperpowers so it stays that way'). git status confirms only '?? .gitignore' is untracked-visible; the spec is invisible to git. If the process intends a committed spec artifact, this defeats it.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b5-prefs-storage
**Scenario Status:** pass

## Description

The agent wrote the spec into docs/hyperpowers/specs/ but then created a .gitignore containing 'docs/superpowers' and 'docs/hyperpowers', explicitly preventing the spec from being committed ('not committed; I added a .gitignore with docs/hyperpowers so it stays that way'). git status confirms only '?? .gitignore' is untracked-visible; the spec is invisible to git. If the process intends a committed spec artifact, this defeats it.
