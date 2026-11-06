# Bug: Commits a10f961 and 0d4efbe have the 'Co-Authored-By: Claude Haiku 4.5' trailer stuck in the subject line instead of a separate trailer. The agent noticed this itself, and the fast-forward merge put both commits into main's history.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Commits a10f961 and 0d4efbe have the 'Co-Authored-By: Claude Haiku 4.5' trailer stuck in the subject line instead of a separate trailer. The agent noticed this itself, and the fast-forward merge put both commits into main's history.
