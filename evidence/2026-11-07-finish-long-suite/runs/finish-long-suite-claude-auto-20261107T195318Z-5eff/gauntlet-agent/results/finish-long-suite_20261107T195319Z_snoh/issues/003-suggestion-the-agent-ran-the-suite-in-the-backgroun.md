# Suggestion: The agent ran the suite in the background and then blocked on a wait-exit helper script with --max-ms 540000 (9 min). It was called twice to cover the roughly 11.7-minute run. Each call shows as 'Waiting for the test suite to finish', so the turn stayed open as the story intends.

**Kind:** suggestion
**Scenario:** finish-long-suite
**Scenario Status:** pass

## Description

The agent ran the suite in the background and then blocked on a wait-exit helper script with --max-ms 540000 (9 min). It was called twice to cover the roughly 11.7-minute run. Each call shows as 'Waiting for the test suite to finish', so the turn stayed open as the story intends.
