# Ux: The agent made the edit with Bash `sed -i ''` (a macOS-only form) rather than the Edit tool. This could make edits harder to audit or hook, because tools that watch Edit/Write won't see this one.

**Kind:** ux
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** fail

## Description

The agent made the edit with Bash `sed -i ''` (a macOS-only form) rather than the Edit tool. This could make edits harder to audit or hook, because tools that watch Edit/Write won't see this one.
