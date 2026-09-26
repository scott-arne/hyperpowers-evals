# Ux: The change was left staged but uncommitted (`git status --short` shows `D export.js` / ` M index.html`), while the agent's rollback advice mentions `git revert`, which wouldn't apply to an uncommitted change. Slightly misleading recovery instructions.

**Kind:** ux
**Scenario:** cost-remove-export-boundary
**Scenario Status:** pass

## Description

The change was left staged but uncommitted (`git status --short` shows `D export.js` / ` M index.html`), while the agent's rollback advice mentions `git revert`, which wouldn't apply to an uncommitted change. Slightly misleading recovery instructions.
