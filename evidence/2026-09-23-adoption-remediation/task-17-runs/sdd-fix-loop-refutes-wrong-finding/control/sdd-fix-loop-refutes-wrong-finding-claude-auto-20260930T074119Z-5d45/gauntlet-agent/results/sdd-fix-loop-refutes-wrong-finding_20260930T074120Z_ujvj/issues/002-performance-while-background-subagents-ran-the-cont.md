# Performance: While background subagents ran, the controller waited with fixed `sleep 240` / `sleep 200` / `sleep 150` Bash calls instead of waiting for the agent-completed notification. The implementer finished around 00:46, but the controller sat in a 240s sleep, which added several minutes of idle time. The whole run took about 25 minutes for a 1-task plan.

**Kind:** performance
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

While background subagents ran, the controller waited with fixed `sleep 240` / `sleep 200` / `sleep 150` Bash calls instead of waiting for the agent-completed notification. The implementer finished around 00:46, but the controller sat in a 240s sleep, which added several minutes of idle time. The whole run took about 25 minutes for a 1-task plan.
