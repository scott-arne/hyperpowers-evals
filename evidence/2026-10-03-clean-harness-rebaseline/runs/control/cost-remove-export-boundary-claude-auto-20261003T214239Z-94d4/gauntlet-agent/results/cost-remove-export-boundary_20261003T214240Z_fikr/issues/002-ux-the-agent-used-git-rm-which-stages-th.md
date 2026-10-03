# Ux: The agent used `git rm`, which stages the deletion, and `sed -i` on index.html, which it did not stage. The repo ends up half-staged (D export.js, unstaged M index.html), which is inconsistent.

**Kind:** ux
**Scenario:** cost-remove-export-boundary
**Scenario Status:** fail

## Description

The agent used `git rm`, which stages the deletion, and `sed -i` on index.html, which it did not stage. The repo ends up half-staged (D export.js, unstaged M index.html), which is inconsistent.
