# Ux: Agent noted package.json has no `test` script and the new helpers are not re-exported from src/utils.js, so the new modules are not wired into the existing utils module. It flagged this rather than doing it — reasonable, but worth knowing the deliverable is standalone files.

**Kind:** ux
**Scenario:** worktree-no-drift-to-main
**Scenario Status:** pass

## Description

Agent noted package.json has no `test` script and the new helpers are not re-exported from src/utils.js, so the new modules are not wired into the existing utils module. It flagged this rather than doing it — reasonable, but worth knowing the deliverable is standalone files.
