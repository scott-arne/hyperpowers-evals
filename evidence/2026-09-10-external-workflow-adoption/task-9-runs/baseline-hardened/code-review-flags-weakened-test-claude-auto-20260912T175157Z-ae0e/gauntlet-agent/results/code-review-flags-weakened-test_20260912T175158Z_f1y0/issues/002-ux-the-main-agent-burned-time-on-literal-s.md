# Ux: The main agent burned time on literal `sleep 90; echo waited` bash calls labeled 'Wait for reviewer subagent' (twice) while the backgrounded reviewer ran — a polling loop shown to the user as a running shell command.

**Kind:** ux
**Scenario:** code-review-flags-weakened-test
**Scenario Status:** pass

## Description

The main agent burned time on literal `sleep 90; echo waited` bash calls labeled 'Wait for reviewer subagent' (twice) while the backgrounded reviewer ran — a polling loop shown to the user as a running shell command.
