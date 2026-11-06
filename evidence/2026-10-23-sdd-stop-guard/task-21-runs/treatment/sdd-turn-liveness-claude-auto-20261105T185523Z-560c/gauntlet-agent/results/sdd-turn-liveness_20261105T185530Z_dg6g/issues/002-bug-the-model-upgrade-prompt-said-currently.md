# Bug: The model-upgrade prompt said 'Currently pinned: Opus 5' even though the launcher passes --model claude-opus-5-5. I chose No. The header then showed 'Opus 5.5 · Google Vertex AI', so the prompt seems to ignore the --model flag.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The model-upgrade prompt said 'Currently pinned: Opus 5' even though the launcher passes --model claude-opus-5-5. I chose No. The header then showed 'Opus 5.5 · Google Vertex AI', so the prompt seems to ignore the --model flag.
