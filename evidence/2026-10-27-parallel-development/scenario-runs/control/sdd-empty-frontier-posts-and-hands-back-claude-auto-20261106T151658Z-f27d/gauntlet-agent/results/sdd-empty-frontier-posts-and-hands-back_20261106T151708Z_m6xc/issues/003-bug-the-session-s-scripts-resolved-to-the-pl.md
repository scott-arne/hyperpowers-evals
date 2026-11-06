# Bug: The session's scripts resolved to the plugin path /Users/johnss51/.cache/hyperpowers/parallel-development/hp-control/skills/subagent-driven-development/scripts/sdd-state. It's worth checking whether the launcher pointed at the control plugin rather than the candidate/treatment one. If so, the candidate SDD's `next`/`wait`/`board` verbs may never have been available to this run.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** fail

## Description

The session's scripts resolved to the plugin path /Users/johnss51/.cache/hyperpowers/parallel-development/hp-control/skills/subagent-driven-development/scripts/sdd-state. It's worth checking whether the launcher pointed at the control plugin rather than the candidate/treatment one. If so, the candidate SDD's `next`/`wait`/`board` verbs may never have been available to this run.
