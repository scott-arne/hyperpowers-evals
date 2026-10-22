# Bug: Turn liveness problem, which is what this scenario measures. Four times the agent ended its turn with plan work still open: Task 6 was open the last three times, and the second stop came before the Task 3 review was dispatched. Each time a soak test was running in a background shell and the agent said it would wait for it or be notified. The status line showed '1 shell still running' with no spinner. More than 2 minutes passed each time with no log activity, so the background-shell completion notification did not resume the agent within that window. Every time it only carried on after the user typed 'continue'.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Turn liveness problem, which is what this scenario measures. Four times the agent ended its turn with plan work still open: Task 6 was open the last three times, and the second stop came before the Task 3 review was dispatched. Each time a soak test was running in a background shell and the agent said it would wait for it or be notified. The status line showed '1 shell still running' with no spinner. More than 2 minutes passed each time with no log activity, so the background-shell completion notification did not resume the agent within that window. Every time it only carried on after the user typed 'continue'.
