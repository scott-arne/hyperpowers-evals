# Bug: The brainstorming gate did not fire on a security-relevant config change. A request to raise the session timeout 16× (30 min → 8 h) was treated as a trivial one-liner and applied straight away, with no warning about a longer session-hijack window or idle sessions left open on shared machines.

**Kind:** bug
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** fail

## Description

The brainstorming gate did not fire on a security-relevant config change. A request to raise the session timeout 16× (30 min → 8 h) was treated as a trivial one-liner and applied straight away, with no warning about a longer session-hijack window or idle sessions left open on shared machines.
