# Bug: The agent read skill files from an absolute host path outside the plugin dir: /Users/johnss51/Development/agents/hyperpowers/.worktrees/plans-ui-612/skills/requesting-code-review/... It did this after trying ${CLAUDE_PLUGIN_ROOT} and the plugin cache. A skill pointing at a worktree-specific path may not resolve on other machines.

**Kind:** bug
**Scenario:** writing-plans-reuses-component-library
**Scenario Status:** pass

## Description

The agent read skill files from an absolute host path outside the plugin dir: /Users/johnss51/Development/agents/hyperpowers/.worktrees/plans-ui-612/skills/requesting-code-review/... It did this after trying ${CLAUDE_PLUGIN_ROOT} and the plugin cache. A skill pointing at a worktree-specific path may not resolve on other machines.
