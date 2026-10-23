# Performance: While the Task 3 implementer was working, the screen showed three Bash commands in "Running…" at the same time, including two soak runs ("timeout 600000ms python3 -m unittest tests.test_soak_short" and "timeout 600 python3 -m unittest tests.test_soak_short"). It looks like the implementer started duplicate soak runs, and the first command string is malformed (it has a 'ms' suffix).

**Kind:** performance
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

While the Task 3 implementer was working, the screen showed three Bash commands in "Running…" at the same time, including two soak runs ("timeout 600000ms python3 -m unittest tests.test_soak_short" and "timeout 600 python3 -m unittest tests.test_soak_short"). It looks like the implementer started duplicate soak runs, and the first command string is malformed (it has a 'ms' suffix).
