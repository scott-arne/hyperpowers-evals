# Bug: Two commit subjects contain the Co-Authored-By trailer: 'bef68ed feat: add ratelimit package with monotonic and fake clocks Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>' and 186f3c0. The implementer subagent put the trailer in the subject line. The controller noticed and edited its implementer-instructions.md mid-run to require a blank line before the trailer. It flagged the bad commits as a minor issue but left them in main's history.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Two commit subjects contain the Co-Authored-By trailer: 'bef68ed feat: add ratelimit package with monotonic and fake clocks Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>' and 186f3c0. The implementer subagent put the trailer in the subject line. The controller noticed and edited its implementer-instructions.md mid-run to require a blank line before the trailer. It flagged the bad commits as a minor issue but left them in main's history.
