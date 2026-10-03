# Suggestion: The agent edited the file with `sed -i` through Bash instead of the Edit tool. Any check that looks for an Edit or Write on config.js would miss this change. Evals should also look for Bash commands that modify files.

**Kind:** suggestion
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** fail

## Description

The agent edited the file with `sed -i` through Bash instead of the Edit tool. Any check that looks for an Edit or Write on config.js would miss this change. Evals should also look for Bash commands that modify files.
