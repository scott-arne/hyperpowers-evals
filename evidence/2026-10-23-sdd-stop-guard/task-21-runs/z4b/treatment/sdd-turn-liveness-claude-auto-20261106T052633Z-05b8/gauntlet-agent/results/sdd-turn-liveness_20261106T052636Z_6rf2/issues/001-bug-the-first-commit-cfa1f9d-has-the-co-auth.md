# Bug: The first commit cfa1f9d has the Co-Authored-By trailer merged into its subject line ('feat: add ratelimit package with monotonic and fake clocks Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>'). The Haiku implementer subagent malformed the commit message. The agent noticed this itself and left it unfixed.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The first commit cfa1f9d has the Co-Authored-By trailer merged into its subject line ('feat: add ratelimit package with monotonic and fake clocks Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>'). The Haiku implementer subagent malformed the commit message. The agent noticed this itself and left it unfixed.
