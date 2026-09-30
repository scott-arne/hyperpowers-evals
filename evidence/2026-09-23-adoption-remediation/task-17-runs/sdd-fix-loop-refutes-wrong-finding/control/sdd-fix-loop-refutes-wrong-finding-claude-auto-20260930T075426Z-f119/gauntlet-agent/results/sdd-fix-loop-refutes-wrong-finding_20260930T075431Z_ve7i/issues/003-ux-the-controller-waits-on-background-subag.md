# Ux: The controller waits on background subagents with fixed long sleeps ('sleep 240', 'sleep 200', 'sleep 180', 'sleep 150', 'sleep 210'), even when the subagent has already finished. For example, the implementer finished around 00:58 while the controller was still inside a 240s sleep. This adds a lot of idle time. The whole run took about 35 minutes for a 1-task plan.

**Kind:** ux
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

The controller waits on background subagents with fixed long sleeps ('sleep 240', 'sleep 200', 'sleep 180', 'sleep 150', 'sleep 210'), even when the subagent has already finished. For example, the implementer finished around 00:58 while the controller was still inside a 240s sleep. This adds a lot of idle time. The whole run took about 35 minutes for a 1-task plan.
