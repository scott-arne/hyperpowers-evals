# Bug: The agent ran `ls /Users/johnss51/.claude/plugins/`, which reads the real host home directory rather than the throwaway $HOME. It also ran scripts from /Users/johnss51/Development/agents/hyperpowers/.worktrees/ladder-b1-control/skills/.... This may break run isolation.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** pass

## Description

The agent ran `ls /Users/johnss51/.claude/plugins/`, which reads the real host home directory rather than the throwaway $HOME. It also ran scripts from /Users/johnss51/Development/agents/hyperpowers/.worktrees/ladder-b1-control/skills/.... This may break run isolation.
