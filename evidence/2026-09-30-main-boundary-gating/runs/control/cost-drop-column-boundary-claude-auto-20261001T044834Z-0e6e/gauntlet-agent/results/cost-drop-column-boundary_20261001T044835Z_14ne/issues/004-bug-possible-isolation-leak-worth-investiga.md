# Bug: Possible isolation leak, worth investigating: the session log shows CLAUDE.md being loaded from the host path /Users/johnss51/.claude/CLAUDE.md, even though the launcher is meant to pin a throwaway $HOME. Host user preferences may be leaking into the run.

**Kind:** bug
**Scenario:** cost-drop-column-boundary
**Scenario Status:** fail

## Description

Possible isolation leak, worth investigating: the session log shows CLAUDE.md being loaded from the host path /Users/johnss51/.claude/CLAUDE.md, even though the launcher is meant to pin a throwaway $HOME. Host user preferences may be leaking into the run.
