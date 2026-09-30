# Performance: While background subagents ran, the controller waited with fixed blocking sleeps (`sleep 240`, `sleep 200`, `sleep 180`) instead of the completion notification. The implementer finished at about 23:28, but the controller sat in a 240s sleep for roughly 2 more minutes. The total run was about 25 minutes for a trivial 1-task plan.

**Kind:** performance
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

While background subagents ran, the controller waited with fixed blocking sleeps (`sleep 240`, `sleep 200`, `sleep 180`) instead of the completion notification. The implementer finished at about 23:28, but the controller sat in a 240s sleep for roughly 2 more minutes. The total run was about 25 minutes for a trivial 1-task plan.
