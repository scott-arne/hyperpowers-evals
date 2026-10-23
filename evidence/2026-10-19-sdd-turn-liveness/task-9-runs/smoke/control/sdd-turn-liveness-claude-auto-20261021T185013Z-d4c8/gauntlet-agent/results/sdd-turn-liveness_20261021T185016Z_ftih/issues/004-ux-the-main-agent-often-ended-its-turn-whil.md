# Ux: The main agent often ended its turn while backgrounded subagents or shells were still running (e.g. 'Crunched for 12m 24s · done 12:03 PM · 1 shell still running'). It resumed on its own when they finished. Still, the prompt looks idle and the only sign of activity is the footer ('2 shells', the subagent row with a timer). A user could easily take that for a stall.

**Kind:** ux
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The main agent often ended its turn while backgrounded subagents or shells were still running (e.g. 'Crunched for 12m 24s · done 12:03 PM · 1 shell still running'). It resumed on its own when they finished. Still, the prompt looks idle and the only sign of activity is the footer ('2 shells', the subagent row with a timer). A user could easily take that for a stall.
