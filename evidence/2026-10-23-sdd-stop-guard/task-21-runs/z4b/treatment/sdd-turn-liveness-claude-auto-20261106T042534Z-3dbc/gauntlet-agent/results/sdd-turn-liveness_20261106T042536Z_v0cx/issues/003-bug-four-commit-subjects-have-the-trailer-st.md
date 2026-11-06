# Bug: Four commit subjects have the trailer stuck onto the subject line, e.g. 'feat: add token bucket limiter Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>'. The Haiku implementer subagents wrote the trailer badly. The agent noticed this and left it in place.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Four commit subjects have the trailer stuck onto the subject line, e.g. 'feat: add token bucket limiter Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>'. The Haiku implementer subagents wrote the trailer badly. The agent noticed this and left it in place.
