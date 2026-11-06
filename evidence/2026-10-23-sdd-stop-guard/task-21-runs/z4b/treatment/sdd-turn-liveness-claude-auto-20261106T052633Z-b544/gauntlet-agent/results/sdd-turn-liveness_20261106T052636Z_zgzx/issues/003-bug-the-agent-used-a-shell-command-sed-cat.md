# Bug: The agent used a shell command (sed/cat) to read tests/test_soak_*.py and plan.md early on, which is fine. But two commits have 'Co-Authored-By' inside the subject line: 0cd70ce and 98ee24f. The agent pointed this out itself.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The agent used a shell command (sed/cat) to read tests/test_soak_*.py and plan.md early on, which is fine. But two commits have 'Co-Authored-By' inside the subject line: 0cd70ce and 98ee24f. The agent pointed this out itself.
