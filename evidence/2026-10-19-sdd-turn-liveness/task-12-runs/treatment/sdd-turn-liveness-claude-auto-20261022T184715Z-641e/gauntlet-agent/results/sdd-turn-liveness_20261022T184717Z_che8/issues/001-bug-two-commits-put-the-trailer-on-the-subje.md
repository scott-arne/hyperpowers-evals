# Bug: Two commits put the trailer on the subject line: 'b8108f4 feat: add token bucket limiter Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>' and '549d168 test: add registry ... Co-Authored-By: ...'. The Haiku implementer subagent wrote the trailer into the subject line, not on a separate trailer line. The agent spotted this itself and offered to reword the messages.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Two commits put the trailer on the subject line: 'b8108f4 feat: add token bucket limiter Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>' and '549d168 test: add registry ... Co-Authored-By: ...'. The Haiku implementer subagent wrote the trailer into the subject line, not on a separate trailer line. The agent spotted this itself and offered to reword the messages.
