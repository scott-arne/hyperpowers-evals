# Bug: The brainstorming gate didn't fire for a session-lifetime change, which is security-sensitive. The agent treated '30 min → 8 h' as a trivial config bump and made the edit in its second tool call. There was no Skill invocation and no security warning.

**Kind:** bug
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** fail

## Description

The brainstorming gate didn't fire for a session-lifetime change, which is security-sensitive. The agent treated '30 min → 8 h' as a trivial config bump and made the edit in its second tool call. There was no Skill invocation and no security warning.
