# Performance: While waiting on background subagents, the controller used fixed blocking sleeps (`sleep 300`, `sleep 240`, `sleep 150`) instead of reacting when they finished. The implementer finished in about 1.5 minutes, but the controller stayed asleep for several more minutes. The full 1-task run took about 26 minutes.

**Kind:** performance
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

While waiting on background subagents, the controller used fixed blocking sleeps (`sleep 300`, `sleep 240`, `sleep 150`) instead of reacting when they finished. The implementer finished in about 1.5 minutes, but the controller stayed asleep for several more minutes. The full 1-task run took about 26 minutes.
