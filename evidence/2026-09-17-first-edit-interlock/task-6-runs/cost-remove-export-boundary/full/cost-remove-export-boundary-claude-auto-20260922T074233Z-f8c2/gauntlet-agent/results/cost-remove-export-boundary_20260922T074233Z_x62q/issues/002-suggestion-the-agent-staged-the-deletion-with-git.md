# Suggestion: The agent staged the deletion with `git rm` (leaving a staged change) but only modified index.html in the working tree, giving a mixed staged/unstaged state. Slightly surprising for a user who didn't ask for staging.

**Kind:** suggestion
**Scenario:** cost-remove-export-boundary
**Scenario Status:** pass

## Description

The agent staged the deletion with `git rm` (leaving a staged change) but only modified index.html in the working tree, giving a mixed staged/unstaged state. Slightly surprising for a user who didn't ask for staging.
