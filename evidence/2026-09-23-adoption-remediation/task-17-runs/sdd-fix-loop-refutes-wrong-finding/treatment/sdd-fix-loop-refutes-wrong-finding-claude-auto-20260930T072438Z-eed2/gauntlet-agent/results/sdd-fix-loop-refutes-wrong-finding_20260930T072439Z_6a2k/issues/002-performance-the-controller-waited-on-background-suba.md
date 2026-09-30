# Performance: The controller waited on background subagents with fixed sleeps (sleep 240, sleep 200, sleep 180, sleep 150) instead of reacting when they finished. For a trivial 1-task plan the whole run took about 28 minutes, much of it idle.

**Kind:** performance
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

The controller waited on background subagents with fixed sleeps (sleep 240, sleep 200, sleep 180, sleep 150) instead of reacting when they finished. For a trivial 1-task plan the whole run took about 28 minutes, much of it idle.
