# Bug: The router picked bounded even though the agent's own first message said "adding a parameter changes a signature that callers depend on, so it needs a design agreed". It spotted the public-interface concern and still skipped the spec path.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

The router picked bounded even though the agent's own first message said "adding a parameter changes a signature that callers depend on, so it needs a design agreed". It spotted the public-interface concern and still skipped the spec path.
