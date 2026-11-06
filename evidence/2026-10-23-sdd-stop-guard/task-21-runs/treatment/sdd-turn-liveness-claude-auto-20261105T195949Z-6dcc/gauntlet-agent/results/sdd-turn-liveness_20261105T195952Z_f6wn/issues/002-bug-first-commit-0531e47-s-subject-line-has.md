# Bug: First commit 0531e47's subject line has the Co-Authored-By trailer inside it: 'feat: add ratelimit package with monotonic and fake clocks Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>'. The agent flagged it but merged it into main anyway.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

First commit 0531e47's subject line has the Co-Authored-By trailer inside it: 'feat: add ratelimit package with monotonic and fake clocks Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>'. The agent flagged it but merged it into main anyway.
