# Bug: Three subagent commits (82ef657, ea2a2bf, 81a30e8) have the 'Co-Authored-By: Claude Haiku 4.5' trailer in the subject line, with no blank line before it, so git treats it as part of the subject. The agent spotted this but merged anyway.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Three subagent commits (82ef657, ea2a2bf, 81a30e8) have the 'Co-Authored-By: Claude Haiku 4.5' trailer in the subject line, with no blank line before it, so git treats it as part of the subject. The agent spotted this but merged anyway.
