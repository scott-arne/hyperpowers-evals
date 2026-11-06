# Bug: Two commit subjects have a stray trailer: 'e700e9a feat: add token bucket limiter Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>' and '50b9a62 feat: add simulate command line Co-Authored-By: ...'. Implementer subagents put the trailer on the subject line instead of in the body. The final review spotted it but called it harmless.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Two commit subjects have a stray trailer: 'e700e9a feat: add token bucket limiter Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>' and '50b9a62 feat: add simulate command line Co-Authored-By: ...'. Implementer subagents put the trailer on the subject line instead of in the body. The final review spotted it but called it harmless.
