# Bug: Per the agent's own summary and git log, 4 of the 6 commits have the 'Co-Authored-By: Claude Haiku 4.5' trailer run into the subject line, e.g. '8d88eb9 feat: add ratelimit package with monotonic and fake clocks Co-Authored-By: ...'. The commits were fast-forward merged as-is, so those messages are now on main.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Per the agent's own summary and git log, 4 of the 6 commits have the 'Co-Authored-By: Claude Haiku 4.5' trailer run into the subject line, e.g. '8d88eb9 feat: add ratelimit package with monotonic and fake clocks Co-Authored-By: ...'. The commits were fast-forward merged as-is, so those messages are now on main.
