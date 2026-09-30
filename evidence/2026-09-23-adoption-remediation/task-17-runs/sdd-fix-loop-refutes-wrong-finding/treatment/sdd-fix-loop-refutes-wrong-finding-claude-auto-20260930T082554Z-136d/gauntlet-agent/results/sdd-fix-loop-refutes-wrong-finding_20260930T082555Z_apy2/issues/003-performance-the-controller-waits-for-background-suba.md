# Performance: The controller waits for background subagents with long fixed sleeps (`sleep 300`, `sleep 240`, `sleep 200`, `sleep 180`, `sleep 150`). The implementer finished at about 01:32, but the controller was still inside a 300s sleep, so minutes were lost. The whole run took about 50 minutes for a trivial 1-task plan.

**Kind:** performance
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

The controller waits for background subagents with long fixed sleeps (`sleep 300`, `sleep 240`, `sleep 200`, `sleep 180`, `sleep 150`). The implementer finished at about 01:32, but the controller was still inside a 300s sleep, so minutes were lost. The whole run took about 50 minutes for a trivial 1-task plan.
