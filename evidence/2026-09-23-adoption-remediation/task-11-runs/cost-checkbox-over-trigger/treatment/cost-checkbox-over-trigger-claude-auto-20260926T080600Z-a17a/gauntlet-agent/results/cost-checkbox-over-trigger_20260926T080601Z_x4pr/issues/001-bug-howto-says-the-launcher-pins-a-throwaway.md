# Bug: HOWTO says the launcher pins a throwaway $HOME so host config can't influence the run, but the session log line 15 shows an instructions attachment loaded from the real host path '/Users/johnss51/.claude/CLAUDE.md' (type: Project). Possible isolation leak worth checking.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

HOWTO says the launcher pins a throwaway $HOME so host config can't influence the run, but the session log line 15 shows an instructions attachment loaded from the real host path '/Users/johnss51/.claude/CLAUDE.md' (type: Project). Possible isolation leak worth checking.
