# Bug: After compaction the screen showed the skill files as `../../../../../.worktrees/cost-6-16-2/skills/subagent-driven-development/SKILL.md`, which is a path in a dev worktree outside the eval workspace. This probably comes from how the plugin dir is set up, but it should be checked to confirm the eval loads the intended plugin version.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

After compaction the screen showed the skill files as `../../../../../.worktrees/cost-6-16-2/skills/subagent-driven-development/SKILL.md`, which is a path in a dev worktree outside the eval workspace. This probably comes from how the plugin dir is set up, but it should be checked to confirm the eval loads the intended plugin version.
