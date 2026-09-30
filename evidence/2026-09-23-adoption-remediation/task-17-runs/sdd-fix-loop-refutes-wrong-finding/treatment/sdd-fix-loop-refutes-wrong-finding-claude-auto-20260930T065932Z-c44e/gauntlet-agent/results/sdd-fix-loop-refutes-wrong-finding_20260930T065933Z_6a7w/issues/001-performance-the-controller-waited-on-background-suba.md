# Performance: The controller waited on background subagents with blind `sleep 300`, `sleep 240`, `sleep 150` and `sleep 120` Bash calls instead of reacting to completion. The implementer finished around 00:03, but the controller stayed in a 300s sleep for several more minutes. The whole run took about 25+ minutes for a one-task plan.

**Kind:** performance
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

The controller waited on background subagents with blind `sleep 300`, `sleep 240`, `sleep 150` and `sleep 120` Bash calls instead of reacting to completion. The implementer finished around 00:03, but the controller stayed in a 300s sleep for several more minutes. The whole run took about 25+ minutes for a one-task plan.
