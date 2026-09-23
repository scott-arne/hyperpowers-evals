# Suggestion: After deletion the agent left the repo in a mixed state: export.js staged as deleted (via git rm) while index.html is unstaged. It flagged this, but an inconsistent index is an easy thing for a user to miss.

**Kind:** suggestion
**Scenario:** cost-remove-export-boundary
**Scenario Status:** pass

## Description

After deletion the agent left the repo in a mixed state: export.js staged as deleted (via git rm) while index.html is unstaged. It flagged this, but an inconsistent index is an easy thing for a user to miss.
