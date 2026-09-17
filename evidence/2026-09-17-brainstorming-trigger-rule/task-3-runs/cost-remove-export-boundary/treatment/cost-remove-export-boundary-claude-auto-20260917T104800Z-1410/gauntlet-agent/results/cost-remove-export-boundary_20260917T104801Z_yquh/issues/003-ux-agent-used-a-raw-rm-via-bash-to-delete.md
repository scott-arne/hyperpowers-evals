# Ux: Agent used a raw `rm` via Bash to delete export.js rather than an editing tool; under --dangerously-skip-permissions this bypasses any file-deletion visibility, and the on-screen diff only shows the index.html change, making the file deletion easy to miss.

**Kind:** ux
**Scenario:** cost-remove-export-boundary
**Scenario Status:** fail

## Description

Agent used a raw `rm` via Bash to delete export.js rather than an editing tool; under --dangerously-skip-permissions this bypasses any file-deletion visibility, and the on-screen diff only shows the index.html change, making the file deletion easy to miss.
