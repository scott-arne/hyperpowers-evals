# Bug: Implementer subagent commit messages put 'Co-Authored-By: Claude Haiku 4.5' on the subject line in 4 of 6 commits (for example '242ad4a feat: add simulate command line Co-Authored-By: …'). The agent flagged this itself but did not fix it, and the fast-forward merge kept the commits on main as they were.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Implementer subagent commit messages put 'Co-Authored-By: Claude Haiku 4.5' on the subject line in 4 of 6 commits (for example '242ad4a feat: add simulate command line Co-Authored-By: …'). The agent flagged this itself but did not fix it, and the fast-forward merge kept the commits on main as they were.
