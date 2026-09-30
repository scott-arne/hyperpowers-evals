# Suggestion: Possible isolation leak: the session log contains an 'instructions' attachment that loads /Users/johnss51/.claude/CLAUDE.md as type 'Project', even though HOME was a throwaway directory. The likely cause is that the workdir sits under /Users/johnss51, so Claude picks up a CLAUDE.md from a parent directory. The host user's own instructions may be affecting eval results.

**Kind:** suggestion
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

Possible isolation leak: the session log contains an 'instructions' attachment that loads /Users/johnss51/.claude/CLAUDE.md as type 'Project', even though HOME was a throwaway directory. The likely cause is that the workdir sits under /Users/johnss51, so Claude picks up a CLAUDE.md from a parent directory. The host user's own instructions may be affecting eval results.
