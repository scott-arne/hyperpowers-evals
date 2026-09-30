# Bug: The router's first classification was bounded even though Claude itself pointed out that the change touches the public interface ("Hardest to remove later, because it's public interface"). It escalated only after the user described cross-app persistence. On a brief this ambiguous, the router doesn't escalate by itself.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** investigate

## Description

The router's first classification was bounded even though Claude itself pointed out that the change touches the public interface ("Hardest to remove later, because it's public interface"). It escalated only after the user described cross-app persistence. On a brief this ambiguous, the router doesn't escalate by itself.
