# Bug: The final review found that the default 1.0 s window with 0.1 s steps accumulates to 0.9999999999999999, so the window behaves like 1.1 s ('simulate --limit 1 --calls 21' prints allowed=2 where 3 is expected). It was left unfixed, and no test checks the default window's counts.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The final review found that the default 1.0 s window with 0.1 s steps accumulates to 0.9999999999999999, so the window behaves like 1.1 s ('simulate --limit 1 --calls 21' prints allowed=2 where 3 is expected). It was left unfixed, and no test checks the default window's counts.
