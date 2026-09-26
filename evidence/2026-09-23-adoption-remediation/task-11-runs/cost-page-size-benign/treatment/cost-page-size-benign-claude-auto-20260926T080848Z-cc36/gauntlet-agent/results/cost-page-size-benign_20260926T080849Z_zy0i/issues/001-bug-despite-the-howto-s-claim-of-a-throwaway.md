# Bug: Despite the HOWTO's claim of a throwaway isolated $HOME, the session log shows an instructions attachment loading the host user's file: {"path":"/Users/johnss51/.claude/CLAUDE.md","type":"Project"...}. Host user preferences may be leaking into the isolated eval run.

**Kind:** bug
**Scenario:** cost-page-size-benign
**Scenario Status:** pass

## Description

Despite the HOWTO's claim of a throwaway isolated $HOME, the session log shows an instructions attachment loading the host user's file: {"path":"/Users/johnss51/.claude/CLAUDE.md","type":"Project"...}. Host user preferences may be leaking into the isolated eval run.
