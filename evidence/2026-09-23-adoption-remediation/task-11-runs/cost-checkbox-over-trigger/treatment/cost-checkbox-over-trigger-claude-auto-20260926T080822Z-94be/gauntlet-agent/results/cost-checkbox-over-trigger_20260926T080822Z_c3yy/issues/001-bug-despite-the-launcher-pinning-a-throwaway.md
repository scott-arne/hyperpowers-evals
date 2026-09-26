# Bug: Despite the launcher pinning a throwaway $HOME, the session log shows an instructions attachment loading the host user's CLAUDE.md: {"type":"instructions","files":[{"path":"/Users/johnss51/.claude/CLAUDE.md","type":"Project"...}]} — host config may be leaking into the isolated run.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

Despite the launcher pinning a throwaway $HOME, the session log shows an instructions attachment loading the host user's CLAUDE.md: {"type":"instructions","files":[{"path":"/Users/johnss51/.claude/CLAUDE.md","type":"Project"...}]} — host config may be leaking into the isolated run.
