# Bug: While Task 3 was being implemented, the screen showed the subagent with two short-soak Bash commands both 'Running…' at once: 'timeout 420000ms python3 -m unittest tests.test_soak_short' and 'python3 -m unittest tests.test_soak_short'. That looks like duplicate or overlapping soak runs. The controller later ran the soak again in the background ('Re-run Task 3 soak test').

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** investigate

## Description

While Task 3 was being implemented, the screen showed the subagent with two short-soak Bash commands both 'Running…' at once: 'timeout 420000ms python3 -m unittest tests.test_soak_short' and 'python3 -m unittest tests.test_soak_short'. That looks like duplicate or overlapping soak runs. The controller later ran the soak again in the background ('Re-run Task 3 soak test').
