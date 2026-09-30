# Performance: The controller waits on backgrounded subagents with fixed sleeps ('sleep 300', 'sleep 240', 'sleep 180', 'sleep 150'). The implementer finished in 1m28s, but the controller sat in its 5-minute sleep for several more minutes before it noticed. The whole run took about 30 minutes for a trivial one-task plan.

**Kind:** performance
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

The controller waits on backgrounded subagents with fixed sleeps ('sleep 300', 'sleep 240', 'sleep 180', 'sleep 150'). The implementer finished in 1m28s, but the controller sat in its 5-minute sleep for several more minutes before it noticed. The whole run took about 30 minutes for a trivial one-task plan.
