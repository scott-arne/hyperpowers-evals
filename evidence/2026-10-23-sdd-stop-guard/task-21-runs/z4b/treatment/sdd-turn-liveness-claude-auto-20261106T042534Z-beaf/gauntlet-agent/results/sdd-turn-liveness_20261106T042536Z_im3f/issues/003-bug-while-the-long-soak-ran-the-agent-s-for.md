# Bug: While the long soak ran, the agent's foreground `tracked-job wait --max-ms 600000` was cut off by the harness Bash timeout ('The harness timeout hit before the wait's own bound') and reported 'failed with exit code 3'. The agent recovered and the soak itself exited 0, but the wait bound (600 s) is longer than the tool timeout. That mismatch should be looked at.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

While the long soak ran, the agent's foreground `tracked-job wait --max-ms 600000` was cut off by the harness Bash timeout ('The harness timeout hit before the wait's own bound') and reported 'failed with exit code 3'. The agent recovered and the soak itself exited 0, but the wait bound (600 s) is longer than the tool timeout. That mismatch should be looked at.
