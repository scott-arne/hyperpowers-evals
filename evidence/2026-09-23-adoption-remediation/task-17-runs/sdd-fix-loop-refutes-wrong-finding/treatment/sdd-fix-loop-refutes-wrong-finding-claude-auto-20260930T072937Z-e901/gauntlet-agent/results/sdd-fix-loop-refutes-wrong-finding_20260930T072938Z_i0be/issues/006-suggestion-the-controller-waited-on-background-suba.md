# Suggestion: The controller waited on background subagents with fixed `sleep 180` and `sleep 120` calls instead of being notified when they finished. This adds wall-clock time; the whole run took about 24.5 minutes for a trivial task.

**Kind:** suggestion
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

The controller waited on background subagents with fixed `sleep 180` and `sleep 120` calls instead of being notified when they finished. This adds wall-clock time; the whole run took about 24.5 minutes for a trivial task.
