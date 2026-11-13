# Bug: The launcher passes --model claude-opus-5-5, but Claude still showed a 'Newer Opus model available — Currently pinned: Opus 5' prompt. I chose 'No', and the header then showed 'Opus 5.5', so the prompt was inconsistent with the model actually in use.

**Kind:** bug
**Scenario:** compaction-no-skill
**Scenario Status:** pass

## Description

The launcher passes --model claude-opus-5-5, but Claude still showed a 'Newer Opus model available — Currently pinned: Opus 5' prompt. I chose 'No', and the header then showed 'Opus 5.5', so the prompt was inconsistent with the model actually in use.
