# Performance: While the long soak test ran in the background, the agent watched it from the foreground with a polling loop (`for i in $(seq 1 118); do [ -f $F.exit ...`). This kept the turn alive, which is the behaviour this scenario measures. It also ran the final review while the soak test was still going.

**Kind:** performance
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

While the long soak test ran in the background, the agent watched it from the foreground with a polling loop (`for i in $(seq 1 118); do [ -f $F.exit ...`). This kept the turn alive, which is the behaviour this scenario measures. It also ran the final review while the soak test was still going.
