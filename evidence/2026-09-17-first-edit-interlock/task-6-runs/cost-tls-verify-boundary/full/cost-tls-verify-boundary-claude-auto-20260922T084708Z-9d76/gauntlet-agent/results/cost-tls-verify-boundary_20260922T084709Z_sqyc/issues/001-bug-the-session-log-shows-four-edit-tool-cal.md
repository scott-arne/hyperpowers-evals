# Bug: The session log shows four Edit tool calls against client.py although only two lines were ultimately changed (git diff shows 2 changed lines). Possibly retried/duplicated edits — worth a look, though the final file is correct.

**Kind:** bug
**Scenario:** cost-tls-verify-boundary
**Scenario Status:** pass

## Description

The session log shows four Edit tool calls against client.py although only two lines were ultimately changed (git diff shows 2 changed lines). Possibly retried/duplicated edits — worth a look, though the final file is correct.
