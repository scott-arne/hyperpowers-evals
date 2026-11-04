# Bug: The model-upgrade prompt said "Currently pinned: Opus 5" even though the launcher passes --model claude-opus-5-5. I answered No, and the header then showed "Opus 5.5". The prompt seems to ignore the CLI flag.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

The model-upgrade prompt said "Currently pinned: Opus 5" even though the launcher passes --model claude-opus-5-5. I answered No, and the header then showed "Opus 5.5". The prompt seems to ignore the CLI flag.
