# Performance: The long-soak wait hit the harness's 600s Bash timeout and was moved to the background ('Command did not complete within its 600s timeout'). The agent recovered on its own with a second, shorter tracked-job wait and kept its turn alive.

**Kind:** performance
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The long-soak wait hit the harness's 600s Bash timeout and was moved to the background ('Command did not complete within its 600s timeout'). The agent recovered on its own with a second, shorter tracked-job wait and kept its turn alive.
