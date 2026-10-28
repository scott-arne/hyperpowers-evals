# Bug: Implementer subagents run on Haiku 4.5, and their commit trailers named the wrong model. The agent says Task 3's trailer named Haiku 4.5 'despite my instruction'. The final review flagged this, and a fix subagent reworded the commits, rewriting branch history and leaving a 'pre-reword-backup' tag behind. Reviewers also kept questioning the trailer, and the orchestrator had to overrule them each time.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Implementer subagents run on Haiku 4.5, and their commit trailers named the wrong model. The agent says Task 3's trailer named Haiku 4.5 'despite my instruction'. The final review flagged this, and a fix subagent reworded the commits, rewriting branch history and leaving a 'pre-reword-backup' tag behind. Reviewers also kept questioning the trailer, and the orchestrator had to overrule them each time.
