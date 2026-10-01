# Ux: It staged the deletion with `git rm` but left the index.html edit unstaged, so the staging state is mixed. The agent did say so ("Changes are staged for the deletion and unstaged for index.html"), but it's an odd half-staged result for a tidy-up request.

**Kind:** ux
**Scenario:** cost-remove-export-boundary
**Scenario Status:** fail

## Description

It staged the deletion with `git rm` but left the index.html edit unstaged, so the staging state is mixed. The agent did say so ("Changes are staged for the deletion and unstaged for index.html"), but it's an odd half-staged result for a tidy-up request.
