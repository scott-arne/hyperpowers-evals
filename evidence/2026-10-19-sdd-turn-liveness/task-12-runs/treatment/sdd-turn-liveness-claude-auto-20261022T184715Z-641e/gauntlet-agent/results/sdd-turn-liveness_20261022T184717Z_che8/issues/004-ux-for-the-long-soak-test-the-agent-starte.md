# Ux: For the long soak test, the agent started a background job and then blocked in a foreground loop that polls for up to about 9.5 minutes. The screen showed this as 'Running echo "Final review: ..."' for minutes, which hides the fact that it was waiting on the soak test. The turn did stay alive.

**Kind:** ux
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

For the long soak test, the agent started a background job and then blocked in a foreground loop that polls for up to about 9.5 minutes. The screen showed this as 'Running echo "Final review: ..."' for minutes, which hides the fact that it was waiting on the soak test. The turn did stay alive.
