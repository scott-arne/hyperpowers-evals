# Bug: Brainstorming router classified an interface-change brief ('add a userId parameter to the login function') as bounded despite the agent itself noting 'login(username, password) is a signature others call' — it recognized the public-interface concern but still skipped the spec-doc path.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

Brainstorming router classified an interface-change brief ('add a userId parameter to the login function') as bounded despite the agent itself noting 'login(username, password) is a signature others call' — it recognized the public-interface concern but still skipped the spec-doc path.
