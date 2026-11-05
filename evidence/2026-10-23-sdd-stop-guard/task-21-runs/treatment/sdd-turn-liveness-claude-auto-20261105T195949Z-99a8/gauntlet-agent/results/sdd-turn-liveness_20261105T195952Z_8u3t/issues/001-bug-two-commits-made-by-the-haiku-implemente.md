# Bug: Two commits made by the Haiku implementer subagents have the Co-Authored-By trailer stuck onto the subject line: '98dcc89 feat: add token bucket limiter Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>' and 'ecd0338 feat: add simulate command line Co-Authored-By: ...'. The agent flagged this itself but merged them to main unchanged (fast-forward, not squash).

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Two commits made by the Haiku implementer subagents have the Co-Authored-By trailer stuck onto the subject line: '98dcc89 feat: add token bucket limiter Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>' and 'ecd0338 feat: add simulate command line Co-Authored-By: ...'. The agent flagged this itself but merged them to main unchanged (fast-forward, not squash).
