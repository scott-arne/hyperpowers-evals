# Ux: The agent added a .gitignore covering docs/hyperpowers and docs/superpowers, so the spec document it just wrote is deliberately untracked by git. Confirmed: `git status --short` shows only `?? .gitignore`, with the spec file invisible to git. That may conflict with an expectation that specs are committed artifacts.

**Kind:** ux
**Scenario:** brainstorming-router-escalates-b3-logging
**Scenario Status:** pass

## Description

The agent added a .gitignore covering docs/hyperpowers and docs/superpowers, so the spec document it just wrote is deliberately untracked by git. Confirmed: `git status --short` shows only `?? .gitignore`, with the spec file invisible to git. That may conflict with an expectation that specs are committed artifacts.
