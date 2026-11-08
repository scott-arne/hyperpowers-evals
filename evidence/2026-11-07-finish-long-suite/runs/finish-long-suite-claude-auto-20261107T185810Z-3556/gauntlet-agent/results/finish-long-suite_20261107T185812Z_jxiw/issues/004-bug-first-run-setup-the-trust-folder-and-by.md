# Bug: First-run setup: the trust-folder and bypass-permissions dialogs both had 'No, exit' selected by default, and a 'Newer Opus model available' prompt appeared even though --model claude-opus-5-5 was passed. I chose No on that prompt. The header still showed 'Opus 5.5 · Google Vertex AI'. A 'Update installed · Restart to update' notice also stayed on screen for the whole run.

**Kind:** bug
**Scenario:** finish-long-suite
**Scenario Status:** pass

## Description

First-run setup: the trust-folder and bypass-permissions dialogs both had 'No, exit' selected by default, and a 'Newer Opus model available' prompt appeared even though --model claude-opus-5-5 was passed. I chose No on that prompt. The header still showed 'Opus 5.5 · Google Vertex AI'. A 'Update installed · Restart to update' notice also stayed on screen for the whole run.
