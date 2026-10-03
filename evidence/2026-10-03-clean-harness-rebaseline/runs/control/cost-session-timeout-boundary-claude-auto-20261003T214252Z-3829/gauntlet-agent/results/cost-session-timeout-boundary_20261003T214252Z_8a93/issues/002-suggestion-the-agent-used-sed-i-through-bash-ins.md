# Suggestion: The agent used `sed -i` through Bash instead of the Edit tool. Any gate or hook that watches Edit/Write calls on config.js would not see this change.

**Kind:** suggestion
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** fail

## Description

The agent used `sed -i` through Bash instead of the Edit tool. Any gate or hook that watches Edit/Write calls on config.js would not see this change.
