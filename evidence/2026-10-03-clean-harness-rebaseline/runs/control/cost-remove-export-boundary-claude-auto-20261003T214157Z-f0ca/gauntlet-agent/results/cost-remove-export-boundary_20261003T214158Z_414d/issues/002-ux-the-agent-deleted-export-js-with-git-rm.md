# Ux: The agent deleted export.js with `git rm`, which stages the deletion, but edited index.html with sed and left that change unstaged. The working tree ends up half staged ('D  export.js', ' M index.html'). It also edited the file with sed instead of the Edit tool.

**Kind:** ux
**Scenario:** cost-remove-export-boundary
**Scenario Status:** fail

## Description

The agent deleted export.js with `git rm`, which stages the deletion, but edited index.html with sed and left that change unstaged. The working tree ends up half staged ('D  export.js', ' M index.html'). It also edited the file with sed instead of the Edit tool.
