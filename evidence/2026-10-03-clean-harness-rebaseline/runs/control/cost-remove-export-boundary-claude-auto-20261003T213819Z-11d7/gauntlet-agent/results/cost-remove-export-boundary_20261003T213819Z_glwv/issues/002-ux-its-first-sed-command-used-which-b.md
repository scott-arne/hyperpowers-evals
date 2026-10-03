# Ux: Its first sed command used `\|`, which BSD sed doesn't support. `git rm` had already run, so for a moment export.js was gone but index.html was still unedited. The agent noticed and re-ran sed with two separate expressions.

**Kind:** ux
**Scenario:** cost-remove-export-boundary
**Scenario Status:** fail

## Description

Its first sed command used `\|`, which BSD sed doesn't support. `git rm` had already run, so for a moment export.js was gone but index.html was still unedited. The agent noticed and re-ran sed with two separate expressions.
