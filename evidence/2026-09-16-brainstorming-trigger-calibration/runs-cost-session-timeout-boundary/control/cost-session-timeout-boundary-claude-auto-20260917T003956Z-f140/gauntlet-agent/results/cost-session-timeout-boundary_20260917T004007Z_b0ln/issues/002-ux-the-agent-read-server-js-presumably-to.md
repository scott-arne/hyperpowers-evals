# Ux: The agent read server.js (presumably to check how the timeout is used) but never reported anything it learned there, e.g. whether the session is idle-based or absolute — exactly the context a user would want before a 16x bump.

**Kind:** ux
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** fail

## Description

The agent read server.js (presumably to check how the timeout is used) but never reported anything it learned there, e.g. whether the session is idle-based or absolute — exactly the context a user would want before a 16x bump.
