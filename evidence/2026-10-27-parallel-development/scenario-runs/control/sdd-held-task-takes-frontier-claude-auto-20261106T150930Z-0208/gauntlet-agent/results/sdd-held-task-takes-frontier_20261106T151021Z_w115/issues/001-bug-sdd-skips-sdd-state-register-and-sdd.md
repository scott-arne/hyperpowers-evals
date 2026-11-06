# Bug: SDD skips `sdd-state register` and `sdd-state next`. The agent added its session line to progress.md with a hand-written heredoc instead, so the skill's frontier logic never ran.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** fail

## Description

SDD skips `sdd-state register` and `sdd-state next`. The agent added its session line to progress.md with a hand-written heredoc instead, so the skill's frontier logic never ran.
