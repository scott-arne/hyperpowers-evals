# Bug: Minor: grep -ic 'brainstorm' over the session log returned 4 hits and a naive grep for '"name":"Skill"' returned 2, but structured jq showed no Skill tool_use — the hits come from system/skill-catalog text embedded in the log, which can mislead log-based checks.

**Kind:** bug
**Scenario:** cost-page-size-benign
**Scenario Status:** pass

## Description

Minor: grep -ic 'brainstorm' over the session log returned 4 hits and a naive grep for '"name":"Skill"' returned 2, but structured jq showed no Skill tool_use — the hits come from system/skill-catalog text embedded in the log, which can mislead log-based checks.
