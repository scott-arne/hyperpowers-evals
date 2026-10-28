# Performance: The foreground wait on the 12-minute soak went past the shell's 600 s tool limit and was moved to the background. The agent recovered by calling wait again with a shorter bound, with no user involvement.

**Kind:** performance
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The foreground wait on the 12-minute soak went past the shell's 600 s tool limit and was moved to the background. The agent recovered by calling wait again with a shorter bound, with no user involvement.
