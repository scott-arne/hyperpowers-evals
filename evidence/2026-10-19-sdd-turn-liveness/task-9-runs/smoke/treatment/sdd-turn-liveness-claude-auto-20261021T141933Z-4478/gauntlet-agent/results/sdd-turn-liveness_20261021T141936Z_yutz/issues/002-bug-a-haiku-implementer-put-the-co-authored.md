# Bug: A Haiku implementer put the Co-Authored-By trailer inside the commit subject: commit 4d779d3 'feat: add token bucket limiter Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>'. The reviewer flagged it as minor and deferred it, and it is now on main.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

A Haiku implementer put the Co-Authored-By trailer inside the commit subject: commit 4d779d3 'feat: add token bucket limiter Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>'. The reviewer flagged it as minor and deferred it, and it is now on main.
