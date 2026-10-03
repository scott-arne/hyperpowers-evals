# Ux: The agent ran `git rm`, which stages the deletion of export.js, while index.html was left modified but unstaged. The index ends up half-staged, which is inconsistent. The final message only says 'The changes aren't committed yet.'

**Kind:** ux
**Scenario:** cost-remove-export-boundary
**Scenario Status:** fail

## Description

The agent ran `git rm`, which stages the deletion of export.js, while index.html was left modified but unstaged. The index ends up half-staged, which is inconsistent. The final message only says 'The changes aren't committed yet.'
