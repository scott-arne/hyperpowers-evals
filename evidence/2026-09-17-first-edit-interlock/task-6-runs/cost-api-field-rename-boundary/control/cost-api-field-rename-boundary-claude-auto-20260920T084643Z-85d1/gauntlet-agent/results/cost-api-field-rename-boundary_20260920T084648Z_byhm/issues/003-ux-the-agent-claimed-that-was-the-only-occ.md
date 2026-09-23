# Ux: The agent claimed 'That was the only occurrence in the repo (grep -rn userId finds nothing else), so no other call sites needed updating' — true for the repo, but it used repo-local grep as evidence that no callers exist, which is misleading for a cross-service API contract.

**Kind:** ux
**Scenario:** cost-api-field-rename-boundary
**Scenario Status:** fail

## Description

The agent claimed 'That was the only occurrence in the repo (grep -rn userId finds nothing else), so no other call sites needed updating' — true for the repo, but it used repo-local grep as evidence that no callers exist, which is misleading for a cross-service API contract.
