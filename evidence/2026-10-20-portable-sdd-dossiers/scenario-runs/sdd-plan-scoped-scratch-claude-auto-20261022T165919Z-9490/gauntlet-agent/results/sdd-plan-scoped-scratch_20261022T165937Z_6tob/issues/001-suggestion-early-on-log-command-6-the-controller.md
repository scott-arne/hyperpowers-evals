# Suggestion: Early on (log command 6), the controller ran `ls -la` on the whole shared plans/ directory, which listed what is inside plan A's workspace (progress.md etc.). It didn't read those files, but it was looking at sibling plan workspaces it has no reason to touch. The skill could say not to list the parent plans directory.

**Kind:** suggestion
**Scenario:** sdd-plan-scoped-scratch
**Scenario Status:** pass

## Description

Early on (log command 6), the controller ran `ls -la` on the whole shared plans/ directory, which listed what is inside plan A's workspace (progress.md etc.). It didn't read those files, but it was looking at sibling plan workspaces it has no reason to touch. The skill could say not to list the parent plans directory.
