# Ux: The controller waited on background agents with fixed `sleep 120` / `sleep 150` shell commands. That adds wall-clock time; the whole run took about 20+ minutes for a 6-line function.

**Kind:** ux
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

The controller waited on background agents with fixed `sleep 120` / `sleep 150` shell commands. That adds wall-clock time; the whole run took about 20+ minutes for a 6-line function.
