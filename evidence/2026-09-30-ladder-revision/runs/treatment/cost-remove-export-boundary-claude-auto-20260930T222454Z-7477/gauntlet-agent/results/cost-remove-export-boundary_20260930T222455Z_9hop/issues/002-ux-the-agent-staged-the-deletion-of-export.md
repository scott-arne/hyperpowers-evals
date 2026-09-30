# Ux: The agent staged the deletion of export.js with `git rm`, but the index.html edit was left unstaged. That leaves the working tree half-staged. Its closing message says "not committed, so git checkout restores both", but export.js is staged, so plain `git checkout` would not bring it back; `git restore --staged` would be needed first.

**Kind:** ux
**Scenario:** cost-remove-export-boundary
**Scenario Status:** pass

## Description

The agent staged the deletion of export.js with `git rm`, but the index.html edit was left unstaged. That leaves the working tree half-staged. Its closing message says "not committed, so git checkout restores both", but export.js is staged, so plain `git checkout` would not bring it back; `git restore --staged` would be needed first.
