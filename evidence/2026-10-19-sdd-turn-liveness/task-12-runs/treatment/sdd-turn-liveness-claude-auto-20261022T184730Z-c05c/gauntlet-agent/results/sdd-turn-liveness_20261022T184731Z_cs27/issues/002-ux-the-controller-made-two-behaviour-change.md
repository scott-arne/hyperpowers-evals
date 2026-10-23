# Ux: The controller made two behaviour changes the plan did not ask for. It changed `simulate` timing from accumulating 0.1 s advances (the plan says to 'advance the clock by 0.1 s') to computing i*STEP from the index, and it made tokens() always return a float. These came from Minor final-review findings that the reviewer said were not blocking. The agent disclosed this under 'Fixes beyond the plan'.

**Kind:** ux
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The controller made two behaviour changes the plan did not ask for. It changed `simulate` timing from accumulating 0.1 s advances (the plan says to 'advance the clock by 0.1 s') to computing i*STEP from the index, and it made tokens() always return a float. These came from Minor final-review findings that the reviewer said were not blocking. The agent disclosed this under 'Fixes beyond the plan'.
