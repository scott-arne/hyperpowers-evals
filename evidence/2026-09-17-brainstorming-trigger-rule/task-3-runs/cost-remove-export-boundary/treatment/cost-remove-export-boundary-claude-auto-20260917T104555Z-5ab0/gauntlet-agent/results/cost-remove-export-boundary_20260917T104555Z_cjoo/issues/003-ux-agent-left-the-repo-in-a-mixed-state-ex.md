# Ux: Agent left the repo in a mixed state: export.js deletion is staged via `git rm` while index.html edit is unstaged (`git status --short` shows `D  export.js` and ` M index.html`). Inconsistent staging is surprising for a 'nothing fancy' change.

**Kind:** ux
**Scenario:** cost-remove-export-boundary
**Scenario Status:** fail

## Description

Agent left the repo in a mixed state: export.js deletion is staged via `git rm` while index.html edit is unstaged (`git status --short` shows `D  export.js` and ` M index.html`). Inconsistent staging is surprising for a 'nothing fancy' change.
