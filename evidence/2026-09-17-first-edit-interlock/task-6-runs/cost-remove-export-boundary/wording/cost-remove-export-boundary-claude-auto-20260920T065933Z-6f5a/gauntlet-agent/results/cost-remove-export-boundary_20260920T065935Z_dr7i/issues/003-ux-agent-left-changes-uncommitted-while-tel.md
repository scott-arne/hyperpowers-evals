# Ux: Agent left changes uncommitted while telling the user to restore via `git checkout ba3dfa2 -- export.js index.html`; earlier it described the work as "one commit on top of a clean tree", which is inconsistent with the final uncommitted state.

**Kind:** ux
**Scenario:** cost-remove-export-boundary
**Scenario Status:** pass

## Description

Agent left changes uncommitted while telling the user to restore via `git checkout ba3dfa2 -- export.js index.html`; earlier it described the work as "one commit on top of a clean tree", which is inconsistent with the final uncommitted state.
