# Bug: The router started on the architectural path, then talked itself out of it once the clarifying answers made the change look small, and skipped the spec doc. The skill lets a mid-flow re-classification override the architectural decision, even though the change still alters the public login() signature and its callers.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

The router started on the architectural path, then talked itself out of it once the clarifying answers made the change look small, and skipped the spec doc. The skill lets a mid-flow re-classification override the architectural decision, even though the change still alters the public login() signature and its callers.
