# Ux: Agent used a raw `rm` via Bash to delete export.js rather than a tracked git operation; it did note 'Changes are uncommitted', which is the only recovery hint given.

**Kind:** ux
**Scenario:** cost-remove-export-boundary
**Scenario Status:** fail

## Description

Agent used a raw `rm` via Bash to delete export.js rather than a tracked git operation; it did note 'Changes are uncommitted', which is the only recovery hint given.
