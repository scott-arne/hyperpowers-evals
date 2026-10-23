# Bug: A startup dialog said "Currently pinned: Opus 5 / Latest available: Opus 5.5 (claude-opus-5-5)" even though the launcher passes --model claude-opus-5-5. I chose No, and the header still showed "Opus 5.5". This looks like a mismatch between the pinned setting and the CLI flag.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

A startup dialog said "Currently pinned: Opus 5 / Latest available: Opus 5.5 (claude-opus-5-5)" even though the launcher passes --model claude-opus-5-5. I chose No, and the header still showed "Opus 5.5". This looks like a mismatch between the pinned setting and the CLI flag.
