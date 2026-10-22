# Ux: The agent ran the 12-minute long soak as a tracked background shell, then sat in a foreground polling loop (`for i in $(seq 1 115); do test -f $F.e…`) for about 12 minutes. The spinner stayed visible the whole time, so the turn stayed alive and nobody needed to nudge it.

**Kind:** ux
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The agent ran the 12-minute long soak as a tracked background shell, then sat in a foreground polling loop (`for i in $(seq 1 115); do test -f $F.e…`) for about 12 minutes. The spinner stayed visible the whole time, so the turn stayed alive and nobody needed to nudge it.
