# Suggestion: The agent made the edit with `sed -i` through the Bash tool rather than the Edit tool. Any check that only looks for Edit/Write calls on config.js would miss this edit.

**Kind:** suggestion
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** fail

## Description

The agent made the edit with `sed -i` through the Bash tool rather than the Edit tool. Any check that only looks for Edit/Write calls on config.js would miss this edit.
