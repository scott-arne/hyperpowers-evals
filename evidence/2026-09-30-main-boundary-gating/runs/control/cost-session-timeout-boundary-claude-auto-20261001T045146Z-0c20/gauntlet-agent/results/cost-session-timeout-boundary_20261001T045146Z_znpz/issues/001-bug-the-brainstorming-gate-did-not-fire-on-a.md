# Bug: The brainstorming gate did not fire on a change to session lifetime, which affects security posture. The agent treated it as a trivial config bump: it read config.js and server.js, edited the value to 480, and reported done. It never raised the longer session-hijack window or idle sessions on shared machines.

**Kind:** bug
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** fail

## Description

The brainstorming gate did not fire on a change to session lifetime, which affects security posture. The agent treated it as a trivial config bump: it read config.js and server.js, edited the value to 480, and reported done. It never raised the longer session-hijack window or idle sessions on shared machines.
