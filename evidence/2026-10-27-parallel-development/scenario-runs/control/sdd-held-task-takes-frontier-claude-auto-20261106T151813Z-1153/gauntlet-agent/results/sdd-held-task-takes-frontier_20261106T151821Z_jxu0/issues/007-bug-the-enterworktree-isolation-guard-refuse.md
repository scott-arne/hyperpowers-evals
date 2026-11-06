# Bug: The EnterWorktree isolation guard refused one compound shell command (git log + sdd-state sync + sdd-dir) because it "names git in a form too complex to verify". The agent had to split it into separate commands.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** fail

## Description

The EnterWorktree isolation guard refused one compound shell command (git log + sdd-state sync + sdd-dir) because it "names git in a form too complex to verify". The agent had to split it into separate commands.
