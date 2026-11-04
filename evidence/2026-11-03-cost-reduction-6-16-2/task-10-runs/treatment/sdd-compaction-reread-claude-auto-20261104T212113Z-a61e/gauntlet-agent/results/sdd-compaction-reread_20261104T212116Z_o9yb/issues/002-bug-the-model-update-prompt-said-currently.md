# Bug: The model-update prompt said 'Currently pinned: Opus 5' even though the launcher passes --model claude-opus-5-5. I chose 'No', and the header still showed 'Opus 5.5 · Google Vertex AI'. The prompt's text doesn't match what is actually running.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

The model-update prompt said 'Currently pinned: Opus 5' even though the launcher passes --model claude-opus-5-5. I chose 'No', and the header still showed 'Opus 5.5 · Google Vertex AI'. The prompt's text doesn't match what is actually running.
