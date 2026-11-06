# Bug: The final review found a real defect in code the plan mandated: the simulate clock added 0.1 s per call, the floating-point error accumulated, and with the default 1.0 s window `--limit 1 --calls 11` printed allowed=1 instead of the expected 2. Commit fd4beba fixed it. The soak tests were not re-run after this fix; the agent reasoned that they don't import the changed files.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The final review found a real defect in code the plan mandated: the simulate clock added 0.1 s per call, the floating-point error accumulated, and with the default 1.0 s window `--limit 1 --calls 11` printed allowed=1 instead of the expected 2. Commit fd4beba fixed it. The soak tests were not re-run after this fix; the agent reasoned that they don't import the changed files.
