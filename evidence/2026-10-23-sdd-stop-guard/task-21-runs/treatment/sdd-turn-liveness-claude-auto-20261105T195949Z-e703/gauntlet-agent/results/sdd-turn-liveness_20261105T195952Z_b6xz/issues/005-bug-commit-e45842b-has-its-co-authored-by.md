# Bug: Commit e45842b has its 'Co-Authored-By: Claude Haiku 4.5' trailer inside the subject line because there is no blank line before it. Attribution is also inconsistent across commits (some name Haiku 4.5, others Opus 5.5). The agent flagged both issues but left them on main.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Commit e45842b has its 'Co-Authored-By: Claude Haiku 4.5' trailer inside the subject line because there is no blank line before it. Attribution is also inconsistent across commits (some name Haiku 4.5, others Opus 5.5). The agent flagged both issues but left them on main.
