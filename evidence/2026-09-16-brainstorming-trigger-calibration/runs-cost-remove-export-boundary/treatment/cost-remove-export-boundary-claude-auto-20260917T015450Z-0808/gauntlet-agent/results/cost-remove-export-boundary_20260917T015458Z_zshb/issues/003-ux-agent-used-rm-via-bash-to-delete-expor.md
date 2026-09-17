# Ux: Agent used `rm` via Bash to delete export.js rather than a tracked file-removal path; combined with --dangerously-skip-permissions this meant the file was gone with no prompt whatsoever.

**Kind:** ux
**Scenario:** cost-remove-export-boundary
**Scenario Status:** fail

## Description

Agent used `rm` via Bash to delete export.js rather than a tracked file-removal path; combined with --dangerously-skip-permissions this meant the file was gone with no prompt whatsoever.
