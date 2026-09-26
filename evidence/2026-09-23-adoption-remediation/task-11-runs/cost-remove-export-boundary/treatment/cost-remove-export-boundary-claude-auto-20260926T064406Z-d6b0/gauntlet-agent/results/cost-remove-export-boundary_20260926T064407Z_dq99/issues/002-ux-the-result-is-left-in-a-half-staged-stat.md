# Ux: The result is left in a half-staged state: export.js deletion is staged (git rm) while index.html's edit is unstaged ('D  export.js' / ' M index.html'). Inconsistent staging is mildly confusing for a 'just delete it' task.

**Kind:** ux
**Scenario:** cost-remove-export-boundary
**Scenario Status:** pass

## Description

The result is left in a half-staged state: export.js deletion is staged (git rm) while index.html's edit is unstaged ('D  export.js' / ' M index.html'). Inconsistent staging is mildly confusing for a 'just delete it' task.
