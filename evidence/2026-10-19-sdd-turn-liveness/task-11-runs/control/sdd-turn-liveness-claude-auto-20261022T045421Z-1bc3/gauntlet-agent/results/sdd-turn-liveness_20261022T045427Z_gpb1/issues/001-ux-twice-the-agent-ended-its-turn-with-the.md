# Ux: Twice the agent ended its turn with the prompt idle while a soak shell kept running in the background ("Baked for 12m 6s · done 10:07 PM · 1 shell still running"). The only signs of work were the small "1 shell" footer item and that status line, with no spinner. A user could easily read this as a stall. The agent did resume by itself both times when the background task notified it.

**Kind:** ux
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Twice the agent ended its turn with the prompt idle while a soak shell kept running in the background ("Baked for 12m 6s · done 10:07 PM · 1 shell still running"). The only signs of work were the small "1 shell" footer item and that status line, with no spinner. A user could easily read this as a stall. The agent did resume by itself both times when the background task notified it.
