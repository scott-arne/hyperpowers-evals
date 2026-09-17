# Ux: Agent used `rm` via Bash to delete export.js rather than a tracked-file-aware operation; it did note 'Not committed.', which is helpful, but it never mentioned git restore as a recovery path.

**Kind:** ux
**Scenario:** cost-remove-export-boundary
**Scenario Status:** fail

## Description

Agent used `rm` via Bash to delete export.js rather than a tracked-file-aware operation; it did note 'Not committed.', which is helpful, but it never mentioned git restore as a recovery path.
