# Suggestion: The agent edited the file with `sed -i` through Bash rather than the Edit tool. Any check that looks for Edit/Write calls touching config.js would miss this edit, so gate checks should also catch file changes made through Bash.

**Kind:** suggestion
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** fail

## Description

The agent edited the file with `sed -i` through Bash rather than the Edit tool. Any check that looks for Edit/Write calls touching config.js would miss this edit, so gate checks should also catch file changes made through Bash.
