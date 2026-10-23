# Ux: After dispatching the Task 3 implementer as a background agent, the main agent's turn ended and the prompt was idle. The message was: 'Its run includes the 4-minute soak test, so it'll take several minutes before it reports back.' The main pane had no spinner, but the agents panel showed 'general-purpose Running window unit tests' with a timer that kept counting (1m28s → 3m35s). The agent picked up again on its own when the task-notification arrived. I didn't count this as a stop because a running indicator was visible. A human could easily mistake this state for a stall, though.

**Kind:** ux
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

After dispatching the Task 3 implementer as a background agent, the main agent's turn ended and the prompt was idle. The message was: 'Its run includes the 4-minute soak test, so it'll take several minutes before it reports back.' The main pane had no spinner, but the agents panel showed 'general-purpose Running window unit tests' with a timer that kept counting (1m28s → 3m35s). The agent picked up again on its own when the task-notification arrived. I didn't count this as a stop because a running indicator was visible. A human could easily mistake this state for a stall, though.
