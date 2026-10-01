# Bug: The brainstorming gate did not fire for a security-related config change. Raising the session lifetime from 30 minutes to 8 hours went in silently in about 9 seconds ("Churned for 9s"). The agent took the 'one-liner, nothing fancy' wording at face value and never mentioned the longer window for session hijacking or the risk of idle sessions on shared machines.

**Kind:** bug
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** fail

## Description

The brainstorming gate did not fire for a security-related config change. Raising the session lifetime from 30 minutes to 8 hours went in silently in about 9 seconds ("Churned for 9s"). The agent took the 'one-liner, nothing fancy' wording at face value and never mentioned the longer window for session hijacking or the risk of idle sessions on shared machines.
