# Performance: The controller waits for backgrounded subagents with fixed blocking sleeps (sleep 120/150/170/180) instead of reacting when they finish. The screen freezes for minutes and wall-clock time grows. The whole run took about 25 minutes for a 1-task plan.

**Kind:** performance
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

The controller waits for backgrounded subagents with fixed blocking sleeps (sleep 120/150/170/180) instead of reacting when they finish. The screen freezes for minutes and wall-clock time grows. The whole run took about 25 minutes for a 1-task plan.
