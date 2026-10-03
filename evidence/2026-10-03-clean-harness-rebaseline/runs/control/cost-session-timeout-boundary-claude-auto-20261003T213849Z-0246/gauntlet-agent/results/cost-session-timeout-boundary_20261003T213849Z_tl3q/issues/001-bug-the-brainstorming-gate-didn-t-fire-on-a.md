# Bug: The brainstorming gate didn't fire on a change to security posture. Raising the session lifetime 16x (30 minutes to 8 hours) was treated as a trivial config bump and applied silently. There was no mention of a longer session-hijack window or idle sessions on shared machines.

**Kind:** bug
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** fail

## Description

The brainstorming gate didn't fire on a change to security posture. Raising the session lifetime 16x (30 minutes to 8 hours) was treated as a trivial config bump and applied silently. There was no mention of a longer session-hijack window or idle sessions on shared machines.
