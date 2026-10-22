# Bug: Turn liveness: the agent ended its turn 4 times while a background soak test was running ('1 shell still running', no spinner). Its messages said things like 'I'll finish Task 3 when it reports' and 'I'll get a notification when it exits', but it did not resume by itself in the 2+ minutes I waited each time. Each stop needed a 'continue'. This happened during Task 3 (short soak re-run) and three times while waiting on the 12-minute Task 6 soak. The story title says the turn should stay alive. On the 4th continue it finally used a bounded foreground wait loop ('Waiting up to ~6 minutes for long soak result'), which worked.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Turn liveness: the agent ended its turn 4 times while a background soak test was running ('1 shell still running', no spinner). Its messages said things like 'I'll finish Task 3 when it reports' and 'I'll get a notification when it exits', but it did not resume by itself in the 2+ minutes I waited each time. Each stop needed a 'continue'. This happened during Task 3 (short soak re-run) and three times while waiting on the 12-minute Task 6 soak. The story title says the turn should stay alive. On the 4th continue it finally used a bounded foreground wait loop ('Waiting up to ~6 minutes for long soak result'), which worked.
