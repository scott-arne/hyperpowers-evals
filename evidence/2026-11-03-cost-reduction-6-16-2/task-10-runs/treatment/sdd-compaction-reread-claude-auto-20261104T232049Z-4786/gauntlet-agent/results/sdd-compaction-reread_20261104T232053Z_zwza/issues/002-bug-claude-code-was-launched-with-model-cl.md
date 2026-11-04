# Bug: Claude Code was launched with --model claude-opus-5-5, yet the startup dialog said 'Currently pinned: Opus 5 / Latest available: Opus 5.5' and offered to update and restart. After I chose 'No', the header showed Opus 5.5 anyway, so the dialog contradicts the flag.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

Claude Code was launched with --model claude-opus-5-5, yet the startup dialog said 'Currently pinned: Opus 5 / Latest available: Opus 5.5' and offered to update and restart. After I chose 'No', the header showed Opus 5.5 anyway, so the dialog contradicts the flag.
