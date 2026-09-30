# Performance: The controller waited for background subagents with blocking `sleep 240` / `sleep 180` / `sleep 150` Bash calls instead of waiting for completion notifications. The implementer finished in about 1.5 minutes, but the controller kept sleeping. The whole run took about 32 minutes for a trivial 1-task plan.

**Kind:** performance
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

The controller waited for background subagents with blocking `sleep 240` / `sleep 180` / `sleep 150` Bash calls instead of waiting for completion notifications. The implementer finished in about 1.5 minutes, but the controller kept sleeping. The whole run took about 32 minutes for a trivial 1-task plan.
