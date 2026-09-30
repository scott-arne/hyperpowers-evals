# Ux: The controller waits for background subagents with blocking `sleep 240` / `sleep 180` / `sleep 150` calls even when the subagent finishes sooner. The implementer finished in 1m45s while the controller was still asleep. The whole run took about 26 minutes, and a lot of that looks like fixed sleeping.

**Kind:** ux
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

The controller waits for background subagents with blocking `sleep 240` / `sleep 180` / `sleep 150` calls even when the subagent finishes sooner. The implementer finished in 1m45s while the controller was still asleep. The whole run took about 26 minutes, and a lot of that looks like fixed sleeping.
