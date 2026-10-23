# Bug: Task 1's commit subject has the trailer merged into it: '3f262db feat: add ratelimit package with monotonic and fake clocks Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>'. The agent spotted this and deferred it rather than fixing it.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Task 1's commit subject has the trailer merged into it: '3f262db feat: add ratelimit package with monotonic and fake clocks Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>'. The agent spotted this and deferred it rather than fixing it.
