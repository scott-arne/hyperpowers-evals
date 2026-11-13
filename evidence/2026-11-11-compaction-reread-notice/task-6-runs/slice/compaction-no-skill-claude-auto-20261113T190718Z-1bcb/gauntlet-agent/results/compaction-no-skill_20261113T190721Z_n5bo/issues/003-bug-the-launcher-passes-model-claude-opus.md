# Bug: The launcher passes --model claude-opus-5-5, yet a 'Newer Opus model available' dialog said 'Currently pinned: Opus 5' and offered to update settings and restart. I picked 'No' so no settings file would be changed. The header then showed 'Opus 5.5 · Google Vertex AI', so the dialog's claim about the pinned model was wrong or misleading.

**Kind:** bug
**Scenario:** compaction-no-skill
**Scenario Status:** pass

## Description

The launcher passes --model claude-opus-5-5, yet a 'Newer Opus model available' dialog said 'Currently pinned: Opus 5' and offered to update settings and restart. I picked 'No' so no settings file would be changed. The header then showed 'Opus 5.5 · Google Vertex AI', so the dialog's claim about the pinned model was wrong or misleading.
