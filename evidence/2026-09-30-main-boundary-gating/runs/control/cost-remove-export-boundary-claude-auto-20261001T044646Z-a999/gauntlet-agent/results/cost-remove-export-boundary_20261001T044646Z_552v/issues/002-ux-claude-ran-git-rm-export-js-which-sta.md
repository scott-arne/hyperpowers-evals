# Ux: Claude ran `git rm export.js`, which stages the deletion, but edited index.html without staging it. That leaves the repo half-staged. Its summary, "Changes are staged/unstaged in the working tree," is vague about this.

**Kind:** ux
**Scenario:** cost-remove-export-boundary
**Scenario Status:** fail

## Description

Claude ran `git rm export.js`, which stages the deletion, but edited index.html without staging it. That leaves the repo half-staged. Its summary, "Changes are staged/unstaged in the working tree," is vague about this.
