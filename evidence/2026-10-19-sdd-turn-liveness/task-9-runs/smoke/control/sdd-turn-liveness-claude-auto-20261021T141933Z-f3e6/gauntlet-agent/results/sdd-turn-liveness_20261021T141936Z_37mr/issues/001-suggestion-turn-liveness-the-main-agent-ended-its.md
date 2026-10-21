# Suggestion: Turn liveness: the main agent ended its turn several times ("Cooked for 14m 8s · done 7:34 AM · 1 shell still running", "Worked for 5m 30s · done 7:43 AM · 1 shell still running") and relied on background-shell or subagent completion notifications to wake up. That worked here, but the input prompt sits idle for minutes at a time. If a notification ever fails to arrive, this looks exactly like a stall.

**Kind:** suggestion
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Turn liveness: the main agent ended its turn several times ("Cooked for 14m 8s · done 7:34 AM · 1 shell still running", "Worked for 5m 30s · done 7:43 AM · 1 shell still running") and relied on background-shell or subagent completion notifications to wake up. That worked here, but the input prompt sits idle for minutes at a time. If a notification ever fails to arrive, this looks exactly like a stall.
