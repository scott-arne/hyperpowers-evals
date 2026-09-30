# Bug: The router first picked bounded for a brief that asks for a public signature change. Its reason was that login has one caller in the same file. It moved to the architectural path only after the user's clarifying answer mentioned cross-app use, persistence and future forms. Without that answer it would probably have gone down the bounded path.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** investigate

## Description

The router first picked bounded for a brief that asks for a public signature change. Its reason was that login has one caller in the same file. It moved to the architectural path only after the user's clarifying answer mentioned cross-app use, persistence and future forms. Without that answer it would probably have gone down the bounded path.
