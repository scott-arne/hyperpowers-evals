# Bug: The agent ran `git rm export.js` twice (session log shows two Bash calls with that command, the second as `git rm export.js && git status --short && git diff --cached --stat`) and issued two Edit calls on index.html — the first pair was blocked by the interlock, but the duplicated work is visible in the log and could be surprising if a command were not idempotent.

**Kind:** bug
**Scenario:** cost-remove-export-boundary
**Scenario Status:** pass

## Description

The agent ran `git rm export.js` twice (session log shows two Bash calls with that command, the second as `git rm export.js && git status --short && git diff --cached --stat`) and issued two Edit calls on index.html — the first pair was blocked by the interlock, but the duplicated work is visible in the log and could be surprising if a command were not idempotent.
