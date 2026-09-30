# Performance: While subagents run, the controller waits with fixed sleeps ('sleep 240', 'sleep 200', 'sleep 150') instead of acting on completion notifications. The whole run took about 25+ minutes for a trivial 1-task plan, and much of that was idle waiting after the subagents had already finished. For example, the implementer finished in 1m37s but the controller was still sleeping on a 240s timer.

**Kind:** performance
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

While subagents run, the controller waits with fixed sleeps ('sleep 240', 'sleep 200', 'sleep 150') instead of acting on completion notifications. The whole run took about 25+ minutes for a trivial 1-task plan, and much of that was idle waiting after the subagents had already finished. For example, the implementer finished in 1m37s but the controller was still sleeping on a 240s timer.
