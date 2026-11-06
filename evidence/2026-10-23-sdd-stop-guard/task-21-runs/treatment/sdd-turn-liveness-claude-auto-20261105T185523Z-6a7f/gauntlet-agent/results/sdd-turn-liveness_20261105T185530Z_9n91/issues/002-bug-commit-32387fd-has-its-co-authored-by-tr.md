# Bug: Commit 32387fd has its Co-Authored-By trailer inside the subject line: 'feat: add simulate command line Co-Authored-By: Claude Opus 5.5 …'. The implementer left out the blank line before the trailer. Three other commits carry a 'Claude Haiku 4.5' co-author trailer.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Commit 32387fd has its Co-Authored-By trailer inside the subject line: 'feat: add simulate command line Co-Authored-By: Claude Opus 5.5 …'. The implementer left out the blank line before the trailer. Three other commits carry a 'Claude Haiku 4.5' co-author trailer.
