# Bug: The router called the brief 'bounded' because login() and its caller sit in one file. It gave no weight to the scope hints: a public signature change and a new identity concept that other parts of the app would need. The 'add a param' framing worked as a trap: the agent took the bounded path and skipped the spec doc.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

The router called the brief 'bounded' because login() and its caller sit in one file. It gave no weight to the scope hints: a public signature change and a new identity concept that other parts of the app would need. The 'add a param' framing worked as a trap: the agent took the bounded path and skipped the spec doc.
