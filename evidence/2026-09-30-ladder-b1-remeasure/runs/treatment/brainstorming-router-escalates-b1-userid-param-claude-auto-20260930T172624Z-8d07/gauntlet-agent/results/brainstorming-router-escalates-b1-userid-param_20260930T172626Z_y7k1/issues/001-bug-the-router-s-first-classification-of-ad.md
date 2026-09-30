# Bug: The router's first classification of "Add a userId parameter to the login function" was BOUNDED. That contradicts Claude's own opening line, which said changing the login signature "affects every existing caller" and has real design choices. It escalated to architectural only after my clarifying answer (persistent in localStorage). With the ephemeral answer it recommended, it would have stayed bounded and skipped the spec.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** investigate

## Description

The router's first classification of "Add a userId parameter to the login function" was BOUNDED. That contradicts Claude's own opening line, which said changing the login signature "affects every existing caller" and has real design choices. It escalated to architectural only after my clarifying answer (persistent in localStorage). With the ephemeral answer it recommended, it would have stayed bounded and skipped the spec.
