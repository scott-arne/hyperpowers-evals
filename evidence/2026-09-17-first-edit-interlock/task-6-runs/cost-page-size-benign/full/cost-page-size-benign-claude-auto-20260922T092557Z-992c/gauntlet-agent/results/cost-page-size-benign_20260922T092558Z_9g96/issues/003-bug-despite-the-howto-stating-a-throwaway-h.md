# Bug: Despite the HOWTO stating a throwaway $HOME isolates the run, the session log shows an instructions attachment referencing a file path under the host home: "files":[{"path":"/Users/johnss51/.claude/CLAUDE...". Possible leakage of host user config into the isolated run.

**Kind:** bug
**Scenario:** cost-page-size-benign
**Scenario Status:** pass

## Description

Despite the HOWTO stating a throwaway $HOME isolates the run, the session log shows an instructions attachment referencing a file path under the host home: "files":[{"path":"/Users/johnss51/.claude/CLAUDE...". Possible leakage of host user config into the isolated run.
