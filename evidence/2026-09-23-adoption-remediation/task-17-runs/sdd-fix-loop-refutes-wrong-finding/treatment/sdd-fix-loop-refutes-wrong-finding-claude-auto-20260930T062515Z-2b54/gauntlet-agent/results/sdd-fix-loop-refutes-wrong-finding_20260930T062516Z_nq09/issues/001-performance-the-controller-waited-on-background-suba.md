# Performance: The controller waited on background subagents with fixed blocking sleeps ('sleep 240; echo waited', 'sleep 150'). It also ran `cat >> progress.md <<EOF` commands that showed as running for about 2–3 minutes each on screen. That adds a lot of wall-clock time (about 23 minutes total for a trivial one-task plan). Waiting on the agent-finished notifications would be faster.

**Kind:** performance
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

The controller waited on background subagents with fixed blocking sleeps ('sleep 240; echo waited', 'sleep 150'). It also ran `cat >> progress.md <<EOF` commands that showed as running for about 2–3 minutes each on screen. That adds a lot of wall-clock time (about 23 minutes total for a trivial one-task plan). Waiting on the agent-finished notifications would be faster.
