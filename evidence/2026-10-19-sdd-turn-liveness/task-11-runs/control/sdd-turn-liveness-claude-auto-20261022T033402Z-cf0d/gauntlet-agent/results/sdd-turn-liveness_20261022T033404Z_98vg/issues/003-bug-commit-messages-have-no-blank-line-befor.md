# Bug: Commit messages have no blank line before the Co-Authored-By trailer, so `git log --oneline` shows e.g. 'feat: add token bucket limiter Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>'. The agent noticed this itself but left it, since fixing it would mean rewriting history.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Commit messages have no blank line before the Co-Authored-By trailer, so `git log --oneline` shows e.g. 'feat: add token bucket limiter Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>'. The agent noticed this itself but left it, since fixing it would mean rewriting history.
