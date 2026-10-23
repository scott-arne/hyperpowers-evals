# Bug: Four commits (eaa244f, b5c6f20, 0c4d70b, f71c700) from the Haiku implementers put 'Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>' on the subject line instead of as a trailer. The agent noticed and reported it but merged anyway, so the malformed history is now on main.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Four commits (eaa244f, b5c6f20, 0c4d70b, f71c700) from the Haiku implementers put 'Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>' on the subject line instead of as a trailer. The agent noticed and reported it but merged anyway, so the malformed history is now on main.
