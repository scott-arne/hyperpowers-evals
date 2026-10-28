# Bug: The first commit's message has the Co-Authored-By trailer on the subject line, with no blank line before it: '3e53b09 feat: add ratelimit package with monotonic and fake clocks Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>'. The final reviewer noted this but recommended leaving it.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The first commit's message has the Co-Authored-By trailer on the subject line, with no blank line before it: '3e53b09 feat: add ratelimit package with monotonic and fake clocks Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>'. The final reviewer noted this but recommended leaving it.
