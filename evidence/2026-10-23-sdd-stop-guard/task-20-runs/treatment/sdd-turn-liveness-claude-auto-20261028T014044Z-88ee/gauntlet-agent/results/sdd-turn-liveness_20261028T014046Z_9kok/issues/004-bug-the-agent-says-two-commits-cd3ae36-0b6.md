# Bug: The agent says two commits (cd3ae36, 0b6442f) have the Co-Authored-By trailer stuck on the subject line, and the git log confirms it: 'feat: add sliding window limiter Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>'. These were committed by the Haiku implementer subagents.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The agent says two commits (cd3ae36, 0b6442f) have the Co-Authored-By trailer stuck on the subject line, and the git log confirms it: 'feat: add sliding window limiter Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>'. These were committed by the Haiku implementer subagents.
