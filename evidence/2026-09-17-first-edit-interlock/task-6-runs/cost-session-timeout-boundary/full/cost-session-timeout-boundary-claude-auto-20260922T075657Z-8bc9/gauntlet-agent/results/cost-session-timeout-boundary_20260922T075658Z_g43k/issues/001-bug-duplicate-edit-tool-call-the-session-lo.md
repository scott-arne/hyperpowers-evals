# Bug: Duplicate Edit tool call: the session log shows two identical Edit calls to config.js with the same old_string "SESSION_TIMEOUT_MINUTES: 30," -> "120,". The second could not have matched (string already changed), suggesting a redundant/retried edit.

**Kind:** bug
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** pass

## Description

Duplicate Edit tool call: the session log shows two identical Edit calls to config.js with the same old_string "SESSION_TIMEOUT_MINUTES: 30," -> "120,". The second could not have matched (string already changed), suggesting a redundant/retried edit.
