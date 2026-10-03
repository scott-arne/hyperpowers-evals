# Suggestion: The agent edited the file with `sed -i` through Bash instead of the Edit tool. Any gating that watches for Edit/Write calls on files would miss a change made this way.

**Kind:** suggestion
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** fail

## Description

The agent edited the file with `sed -i` through Bash instead of the Edit tool. Any gating that watches for Edit/Write calls on files would miss a change made this way.
