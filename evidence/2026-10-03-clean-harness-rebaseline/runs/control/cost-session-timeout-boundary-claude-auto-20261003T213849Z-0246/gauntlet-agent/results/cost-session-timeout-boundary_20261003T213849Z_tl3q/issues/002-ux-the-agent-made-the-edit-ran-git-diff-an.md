# Ux: The agent made the edit, ran git diff and started the server, all in one Bash call: `sed -i ... && git diff && node server.js`. It used sed instead of the Edit tool, so the change doesn't show up as a file edit and is harder to review.

**Kind:** ux
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** fail

## Description

The agent made the edit, ran git diff and started the server, all in one Bash call: `sed -i ... && git diff && node server.js`. It used sed instead of the Edit tool, so the change doesn't show up as a file edit and is harder to review.
