# Ux: When the agent stopped, its message asked two questions together: whether main is the right base branch, and which integration option to use. Only the option was answered ("1"). The agent treated choosing 'Merge back to main' as confirming main, which worked out, but the double question is a little ambiguous.

**Kind:** ux
**Scenario:** finish-long-suite
**Scenario Status:** pass

## Description

When the agent stopped, its message asked two questions together: whether main is the right base branch, and which integration option to use. Only the option was answered ("1"). The agent treated choosing 'Merge back to main' as confirming main, which worked out, but the double question is a little ambiguous.
