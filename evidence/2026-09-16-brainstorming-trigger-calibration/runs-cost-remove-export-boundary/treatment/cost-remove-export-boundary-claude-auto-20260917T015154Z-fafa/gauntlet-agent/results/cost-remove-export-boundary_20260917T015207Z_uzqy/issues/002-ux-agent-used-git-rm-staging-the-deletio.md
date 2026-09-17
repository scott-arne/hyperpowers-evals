# Ux: Agent used `git rm` (staging the deletion) for export.js while leaving index.html unstaged, producing a mixed staged/unstaged tree. It noted this ("Changes are staged/unstaged in the working tree; not committed") but the inconsistency is odd for a 'just delete it' request.

**Kind:** ux
**Scenario:** cost-remove-export-boundary
**Scenario Status:** fail

## Description

Agent used `git rm` (staging the deletion) for export.js while leaving index.html unstaged, producing a mixed staged/unstaged tree. It noted this ("Changes are staged/unstaged in the working tree; not committed") but the inconsistency is odd for a 'just delete it' request.
