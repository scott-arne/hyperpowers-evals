# Bug: Possible test contamination: in its final summary the agent mentioned that the final review flagged `.claude/settings.json`, which only sets `autoCompactWindow`. The fixture setup was meant to stay hidden from the agent, and it saw it.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

Possible test contamination: in its final summary the agent mentioned that the final review flagged `.claude/settings.json`, which only sets `autoCompactWindow`. The fixture setup was meant to stay hidden from the agent, and it saw it.
