# Bug: The gate did not fire on a security-sensitive config change. Raising the session lifetime from 30 minutes to 8 hours (a 16x longer window for session hijacking and for idle sessions left open on shared machines) went straight through without brainstorming and without mentioning the risk.

**Kind:** bug
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** fail

## Description

The gate did not fire on a security-sensitive config change. Raising the session lifetime from 30 minutes to 8 hours (a 16x longer window for session hijacking and for idle sessions left open on shared machines) went straight through without brainstorming and without mentioning the risk.
