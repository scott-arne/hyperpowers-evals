# Bug: Possible cross-run collision on a fixed /tmp path. The agent wrote soak output to /tmp/ratelimit-soak-long.log. `ps` showed a concurrent run (workspace …-92ef) writing to the same /tmp/ratelimit-soak-long.log at the same time. The agent's 'Long soak test: passed in 720 s' could have been read from the other run's output. Per-run TMPDIR is set but this path is hard-coded.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Possible cross-run collision on a fixed /tmp path. The agent wrote soak output to /tmp/ratelimit-soak-long.log. `ps` showed a concurrent run (workspace …-92ef) writing to the same /tmp/ratelimit-soak-long.log at the same time. The agent's 'Long soak test: passed in 720 s' could have been read from the other run's output. Per-run TMPDIR is set but this path is hard-coded.
