# Bug: The bounded call seems to rest on the narrow reason that the function has one caller: "login() already exists in app.js and has one caller". It ignored the cross-cutting concern it had just described itself, which is a persistent localStorage identity scheme that other code will depend on.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

The bounded call seems to rest on the narrow reason that the function has one caller: "login() already exists in app.js and has one caller". It ignored the cross-cutting concern it had just described itself, which is a persistent localStorage identity scheme that other code will depend on.
