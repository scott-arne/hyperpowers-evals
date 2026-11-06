# Bug: Implementer subagent (Haiku) commits have the 'Co-Authored-By: Claude Haiku 4.5' trailer inside the subject line. Example from `git log --oneline`: 'a0c19d0 feat: add token bucket limiter Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>'. Four commits now on main have this. The final review flagged it, but it was not fixed before the merge.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Implementer subagent (Haiku) commits have the 'Co-Authored-By: Claude Haiku 4.5' trailer inside the subject line. Example from `git log --oneline`: 'a0c19d0 feat: add token bucket limiter Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>'. Four commits now on main have this. The final review flagged it, but it was not fixed before the merge.
