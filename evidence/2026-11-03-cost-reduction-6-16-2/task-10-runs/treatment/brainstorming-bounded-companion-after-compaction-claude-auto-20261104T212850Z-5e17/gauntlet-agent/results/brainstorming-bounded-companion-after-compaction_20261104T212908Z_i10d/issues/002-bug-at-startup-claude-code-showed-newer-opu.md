# Bug: At startup Claude Code showed 'Newer Opus model available. Currently pinned: Opus 5', even though the launcher passes --model claude-opus-5-5. I chose 'No', and the banner then showed Opus 5.5. The pinned-model message seems inconsistent with the --model flag.

**Kind:** bug
**Scenario:** brainstorming-bounded-companion-after-compaction
**Scenario Status:** pass

## Description

At startup Claude Code showed 'Newer Opus model available. Currently pinned: Opus 5', even though the launcher passes --model claude-opus-5-5. I chose 'No', and the banner then showed Opus 5.5. The pinned-model message seems inconsistent with the --model flag.
