# Bug: Turn liveness: after starting a long soak test as a background shell, the agent ended its turn 4 times ('Baked for 12m 8s · done 8:47 PM · 1 shell still running', etc.). Each time it waited for user input instead of keeping its turn alive until the covering command finished. It needed 4 'continue' nudges, which is exactly what this story is meant to catch.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Turn liveness: after starting a long soak test as a background shell, the agent ended its turn 4 times ('Baked for 12m 8s · done 8:47 PM · 1 shell still running', etc.). Each time it waited for user input instead of keeping its turn alive until the covering command finished. It needed 4 'continue' nudges, which is exactly what this story is meant to catch.
