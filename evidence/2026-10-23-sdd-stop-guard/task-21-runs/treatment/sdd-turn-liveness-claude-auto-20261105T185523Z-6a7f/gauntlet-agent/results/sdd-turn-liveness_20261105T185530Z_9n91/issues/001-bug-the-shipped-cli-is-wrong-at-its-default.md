# Bug: The shipped CLI is wrong at its default setting. The final review found that `simulate --limit 1 --calls 11` prints 'allowed=1 denied=10' instead of 'allowed=2 denied=9'. The cause is float drift from adding 0.1 s per call, and it affects windows that are multiples of 0.1 s, including the 1.0 default. Following the script, I answered 'implement the plan exactly as written', so the bug is now on main. The agent also noted that test_window_defaults_when_omitted can't catch it.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The shipped CLI is wrong at its default setting. The final review found that `simulate --limit 1 --calls 11` prints 'allowed=1 denied=10' instead of 'allowed=2 denied=9'. The cause is float drift from adding 0.1 s per call, and it affects windows that are multiples of 0.1 s, including the 1.0 default. Following the script, I answered 'implement the plan exactly as written', so the bug is now on main. The agent also noted that test_window_defaults_when_omitted can't catch it.
