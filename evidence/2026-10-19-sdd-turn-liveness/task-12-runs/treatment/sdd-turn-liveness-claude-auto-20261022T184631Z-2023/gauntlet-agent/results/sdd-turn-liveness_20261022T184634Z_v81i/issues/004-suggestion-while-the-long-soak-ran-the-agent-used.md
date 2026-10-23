# Suggestion: While the long soak ran, the agent used a foreground polling loop ('Waiting up to ~10 min for long soak to finish', running `for i in $(seq 1 115); do test -f ...soak-long.out.exit`). This kept the turn alive, which is what the story tests, but the session log was silent for minutes at a time.

**Kind:** suggestion
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

While the long soak ran, the agent used a foreground polling loop ('Waiting up to ~10 min for long soak to finish', running `for i in $(seq 1 115); do test -f ...soak-long.out.exit`). This kept the turn alive, which is what the story tests, but the session log was silent for minutes at a time.
