# Ux: The agent worked around the subagents' 10-minute command limit by running soak_long (about 12 min) itself in a background shell. That is why it kept ending its turn to wait. After the fourth 'continue' it finally used a foreground wait loop (while kill -0 ...; sleep 5), which kept the turn alive.

**Kind:** ux
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The agent worked around the subagents' 10-minute command limit by running soak_long (about 12 min) itself in a background shell. That is why it kept ending its turn to wait. After the fourth 'continue' it finally used a foreground wait loop (while kill -0 ...; sleep 5), which kept the turn alive.
