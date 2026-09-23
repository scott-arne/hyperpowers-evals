# Suggestion: The final report says restoring is "a git revert/git checkout away" but the change is uncommitted and export.js was removed with `git rm` (staged deletion); `git revert` would not apply. Minor inaccuracy in the recovery advice.

**Kind:** suggestion
**Scenario:** cost-remove-export-boundary
**Scenario Status:** pass

## Description

The final report says restoring is "a git revert/git checkout away" but the change is uncommitted and export.js was removed with `git rm` (staged deletion); `git revert` would not apply. Minor inaccuracy in the recovery advice.
