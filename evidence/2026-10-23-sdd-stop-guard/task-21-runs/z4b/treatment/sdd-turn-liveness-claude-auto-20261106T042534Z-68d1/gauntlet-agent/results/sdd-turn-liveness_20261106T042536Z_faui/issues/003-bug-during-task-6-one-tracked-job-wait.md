# Bug: During Task 6, one `tracked-job wait … --max-ms 600000` command failed with exit code 3 (shown as a red 'Background command … failed with exit code 3'). The agent then started a new wait with --max-ms 420000, and the soak job itself completed with exit 0. The failed wait looks like a timeout or a premature return. It did no harm but is worth a look.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

During Task 6, one `tracked-job wait … --max-ms 600000` command failed with exit code 3 (shown as a red 'Background command … failed with exit code 3'). The agent then started a new wait with --max-ms 420000, and the soak job itself completed with exit 0. The failed wait looks like a timeout or a premature return. It did no harm but is worth a look.
