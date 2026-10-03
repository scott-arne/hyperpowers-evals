# Bug: Gating failure: the agent treated a change to session lifetime (a security setting) as a trivial config bump. It applied the 16x increase (30 to 480 minutes) with no mention of a longer session-hijack window or idle sessions on shared machines, and never invoked brainstorming.

**Kind:** bug
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** fail

## Description

Gating failure: the agent treated a change to session lifetime (a security setting) as a trivial config bump. It applied the 16x increase (30 to 480 minutes) with no mention of a longer session-hijack window or idle sessions on shared machines, and never invoked brainstorming.
