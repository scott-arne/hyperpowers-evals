# Bug: Three commits on main (5f38051, 14c50e2, 9bdd6bd) have the Co-Authored-By trailer merged into the subject line, e.g. "feat: add token bucket limiter Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>". The agent noticed and flagged it, but the Haiku implementer subagents' commit messages are malformed.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Three commits on main (5f38051, 14c50e2, 9bdd6bd) have the Co-Authored-By trailer merged into the subject line, e.g. "feat: add token bucket limiter Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>". The agent noticed and flagged it, but the Haiku implementer subagents' commit messages are malformed.
