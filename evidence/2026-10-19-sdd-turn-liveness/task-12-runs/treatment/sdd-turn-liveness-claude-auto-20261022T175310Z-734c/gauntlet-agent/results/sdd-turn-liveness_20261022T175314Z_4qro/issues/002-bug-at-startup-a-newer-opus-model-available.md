# Bug: At startup a 'Newer Opus model available' prompt said 'Currently pinned: Opus 5', even though the launcher passes --model claude-opus-5-5. I chose No, and the header still showed 'Opus 5.5'. The message contradicts the flag.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

At startup a 'Newer Opus model available' prompt said 'Currently pinned: Opus 5', even though the launcher passes --model claude-opus-5-5. I chose No, and the header still showed 'Opus 5.5'. The message contradicts the flag.
