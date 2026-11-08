# Bug: The agent did not keep its turn open while the 12-minute suite ran. It started the suite with run_in_background:true, then ended its turn right away. It ended the turn the same way after each of five 'continue' replies, each time with a short progress update (8/35, 16/35, 24/35, 32/35). Claude Code's own tool result told it 'do not poll that file or sleep while waiting', which probably pushed it toward this.

**Kind:** bug
**Scenario:** finish-long-suite
**Scenario Status:** pass

## Description

The agent did not keep its turn open while the 12-minute suite ran. It started the suite with run_in_background:true, then ended its turn right away. It ended the turn the same way after each of five 'continue' replies, each time with a short progress update (8/35, 16/35, 24/35, 32/35). Claude Code's own tool result told it 'do not poll that file or sleep while waiting', which probably pushed it toward this.
