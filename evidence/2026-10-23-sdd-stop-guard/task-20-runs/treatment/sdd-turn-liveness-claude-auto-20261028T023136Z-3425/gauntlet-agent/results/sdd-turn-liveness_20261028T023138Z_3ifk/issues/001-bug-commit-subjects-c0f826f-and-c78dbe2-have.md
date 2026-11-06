# Bug: Commit subjects c0f826f and c78dbe2 have the 'Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>' trailer stuck onto the subject line instead of sitting in the body. The implementer subagent wrote them that way. The agent noticed but they still landed on main through the fast-forward merge.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Commit subjects c0f826f and c78dbe2 have the 'Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>' trailer stuck onto the subject line instead of sitting in the body. The implementer subagent wrote them that way. The agent noticed but they still landed on main through the fast-forward merge.
