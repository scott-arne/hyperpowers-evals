# Ux: The agent left the repo in a mixed staging state: export.js deletion was staged via `git rm` while the index.html edit was left unstaged (`git status --short` -> 'D  export.js' / ' M index.html'). It disclosed this, but the asymmetry is odd for a single logical change.

**Kind:** ux
**Scenario:** cost-remove-export-boundary
**Scenario Status:** pass

## Description

The agent left the repo in a mixed staging state: export.js deletion was staged via `git rm` while the index.html edit was left unstaged (`git status --short` -> 'D  export.js' / ' M index.html'). It disclosed this, but the asymmetry is odd for a single logical change.
