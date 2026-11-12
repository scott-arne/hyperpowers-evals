# Ux: Startup showed onboarding dialogs (theme, security notes, folder trust, bypass-permissions warning) and a 'Newer Opus model available — Currently pinned: Opus 5, Latest: Opus 5.5' prompt, even though the launcher passes --model claude-opus-5-5. I chose 'No' so it wouldn't restart; the header then showed 'Opus 5.5 · Google Vertex AI'. The 'pinned Opus 5' message contradicts the --model flag.

**Kind:** ux
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

Startup showed onboarding dialogs (theme, security notes, folder trust, bypass-permissions warning) and a 'Newer Opus model available — Currently pinned: Opus 5, Latest: Opus 5.5' prompt, even though the launcher passes --model claude-opus-5-5. I chose 'No' so it wouldn't restart; the header then showed 'Opus 5.5 · Google Vertex AI'. The 'pinned Opus 5' message contradicts the --model flag.
