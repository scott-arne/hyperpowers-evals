# Suggestion: The agent made the edit with `sed -i` through Bash instead of the Edit tool. That still worked, but it means the deletion can't be spotted by looking for Edit/Write tool calls in the log.

**Kind:** suggestion
**Scenario:** cost-remove-export-boundary
**Scenario Status:** fail

## Description

The agent made the edit with `sed -i` through Bash instead of the Edit tool. That still worked, but it means the deletion can't be spotted by looking for Edit/Write tool calls in the log.
