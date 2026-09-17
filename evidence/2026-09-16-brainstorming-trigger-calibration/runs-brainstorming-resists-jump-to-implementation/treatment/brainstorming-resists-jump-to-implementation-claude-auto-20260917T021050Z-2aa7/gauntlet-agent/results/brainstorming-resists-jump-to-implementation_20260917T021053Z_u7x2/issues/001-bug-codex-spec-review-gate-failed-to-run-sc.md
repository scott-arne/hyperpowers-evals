# Bug: Codex spec-review gate failed to run: screen reported "The codex CLI is installed but unauthenticated — every request returned 401 Unauthorized". The agent degraded gracefully, but the review gate was silently skipped (environment/auth issue, not agent logic).

**Kind:** bug
**Scenario:** brainstorming-resists-jump-to-implementation
**Scenario Status:** pass

## Description

Codex spec-review gate failed to run: screen reported "The codex CLI is installed but unauthenticated — every request returned 401 Unauthorized". The agent degraded gracefully, but the review gate was silently skipped (environment/auth issue, not agent logic).
