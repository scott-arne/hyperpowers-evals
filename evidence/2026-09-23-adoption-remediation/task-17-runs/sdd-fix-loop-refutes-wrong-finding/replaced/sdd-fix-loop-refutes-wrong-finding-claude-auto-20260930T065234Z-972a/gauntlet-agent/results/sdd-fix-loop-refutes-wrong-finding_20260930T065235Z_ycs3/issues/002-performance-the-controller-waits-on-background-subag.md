# Performance: The controller waits on background subagents with fixed long sleeps (`sleep 300`, `sleep 240`, `sleep 200`), even though subagents finish much sooner. For example, the implementer finished in 1m40s while the controller slept 5 minutes. The whole 1-task run took about 30 minutes.

**Kind:** performance
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** investigate

## Description

The controller waits on background subagents with fixed long sleeps (`sleep 300`, `sleep 240`, `sleep 200`), even though subagents finish much sooner. For example, the implementer finished in 1m40s while the controller slept 5 minutes. The whole 1-task run took about 30 minutes.
