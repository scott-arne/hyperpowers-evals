# Bug: During Task 6 the screen showed 'Background command "Wait on long soak job" failed with exit code 3', right next to 'Run long soak test as tracked job completed (exit code 0)'. The agent moved on to the final review anyway and reported the 720 s soak as passed. The tracked-job wait helper returning exit 3 deserves a look: it may be a race or timeout in the helper, or the agent may be ignoring a real failure signal.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

During Task 6 the screen showed 'Background command "Wait on long soak job" failed with exit code 3', right next to 'Run long soak test as tracked job completed (exit code 0)'. The agent moved on to the final review anyway and reported the 720 s soak as passed. The tracked-job wait helper returning exit 3 deserves a look: it may be a race or timeout in the helper, or the agent may be ignoring a real failure signal.
