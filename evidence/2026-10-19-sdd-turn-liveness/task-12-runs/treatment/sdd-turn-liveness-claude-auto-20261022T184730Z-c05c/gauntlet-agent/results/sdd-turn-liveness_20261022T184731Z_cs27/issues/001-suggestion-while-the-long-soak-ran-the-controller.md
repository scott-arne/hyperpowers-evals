# Suggestion: While the long soak ran, the controller started it in the background and then blocked in the foreground with a bash loop (`for i in $(seq 1 58); do [ -f "$W/soak-long.out.exit" ] ...`) for 8+ minutes. Its turn stayed alive, which is what this story measures, but the soak's completion was detected by a sleep-poll loop rather than a harness wake-up.

**Kind:** suggestion
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

While the long soak ran, the controller started it in the background and then blocked in the foreground with a bash loop (`for i in $(seq 1 58); do [ -f "$W/soak-long.out.exit" ] ...`) for 8+ minutes. Its turn stayed alive, which is what this story measures, but the soak's completion was detected by a sleep-poll loop rather than a harness wake-up.
