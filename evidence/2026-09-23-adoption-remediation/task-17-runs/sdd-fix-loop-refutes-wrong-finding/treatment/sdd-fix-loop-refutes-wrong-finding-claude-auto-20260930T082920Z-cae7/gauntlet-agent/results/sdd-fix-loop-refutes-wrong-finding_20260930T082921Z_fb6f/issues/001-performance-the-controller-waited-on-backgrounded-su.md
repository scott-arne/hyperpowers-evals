# Performance: The controller waited on backgrounded subagents with blocking `sleep 240`, `sleep 200`, `sleep 180` and `sleep 150` calls. The implementer finished at about 01:32, but the controller slept for minutes before acting on it. Total run time was about 31 minutes for a 1-task plan.

**Kind:** performance
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

The controller waited on backgrounded subagents with blocking `sleep 240`, `sleep 200`, `sleep 180` and `sleep 150` calls. The implementer finished at about 01:32, but the controller slept for minutes before acting on it. Total run time was about 31 minutes for a 1-task plan.
