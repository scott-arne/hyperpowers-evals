# Bug: The router did not escalate. Changing login's public signature to login(username, password, userId) was handled with a short in-chat design and no spec document, even though the agent's own clarifying question offered a no-interface-change option and a server-side option.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

The router did not escalate. Changing login's public signature to login(username, password, userId) was handled with a short in-chat design and no spec document, even though the agent's own clarifying question offered a no-interface-change option and a server-side option.
