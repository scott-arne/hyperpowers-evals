# Bug: Criterion 4's wording mentions a "committed spec file", but this spec was never committed. The agent created a .gitignore containing `docs/superpowers` and `docs/hyperpowers`, and `git check-ignore` confirms the spec is ignored. `git status` shows only `?? .gitignore`, and `git log` has no new commits. An engineer should decide whether ignoring spec docs is intended skill behaviour or a regression.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** pass

## Description

Criterion 4's wording mentions a "committed spec file", but this spec was never committed. The agent created a .gitignore containing `docs/superpowers` and `docs/hyperpowers`, and `git check-ignore` confirms the spec is ignored. `git status` shows only `?? .gitignore`, and `git log` has no new commits. An engineer should decide whether ignoring spec docs is intended skill behaviour or a regression.
