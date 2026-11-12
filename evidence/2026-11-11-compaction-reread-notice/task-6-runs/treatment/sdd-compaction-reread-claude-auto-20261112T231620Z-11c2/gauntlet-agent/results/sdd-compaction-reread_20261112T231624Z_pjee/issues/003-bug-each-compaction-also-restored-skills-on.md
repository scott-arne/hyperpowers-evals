# Bug: Each compaction also restored skills on its own ('Skills restored (hyperpowers:using-git-worktrees, hyperpowers:subagent-driven-development)'), and the controller then read SKILL.md again by hand. That probably loads the large skill text twice per cycle.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

Each compaction also restored skills on its own ('Skills restored (hyperpowers:using-git-worktrees, hyperpowers:subagent-driven-development)'), and the controller then read SKILL.md again by hand. That probably loads the large skill text twice per cycle.
