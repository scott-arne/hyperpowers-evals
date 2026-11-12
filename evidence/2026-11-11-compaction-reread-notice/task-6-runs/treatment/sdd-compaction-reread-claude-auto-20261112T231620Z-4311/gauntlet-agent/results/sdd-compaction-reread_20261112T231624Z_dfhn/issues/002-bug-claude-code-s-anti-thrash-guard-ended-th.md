# Bug: Claude Code's anti-thrash guard ended the turn and the agent stopped. It never told the user it was stuck and never asked a question, so a real user would see only a system warning and an idle prompt.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

Claude Code's anti-thrash guard ended the turn and the agent stopped. It never told the user it was stuck and never asked a question, so a real user would see only a system warning and an idle prompt.
