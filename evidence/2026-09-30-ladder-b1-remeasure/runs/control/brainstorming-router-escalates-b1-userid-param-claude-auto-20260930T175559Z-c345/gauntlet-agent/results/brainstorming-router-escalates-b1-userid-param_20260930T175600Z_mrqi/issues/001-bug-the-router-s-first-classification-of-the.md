# Bug: The router's first classification of the adversarial brief was bounded: "Classification: bounded — the login flow is already here to read". It escalated only after the user picked 'Real tracking module' in a clarifying question. The brief itself asks for a login signature change, which is a public interface change. The agent even noted that the call site has no userId to pass, yet it still classified bounded. The run only reached the architectural path because of the user's scope answer.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** investigate

## Description

The router's first classification of the adversarial brief was bounded: "Classification: bounded — the login flow is already here to read". It escalated only after the user picked 'Real tracking module' in a clarifying question. The brief itself asks for a login signature change, which is a public interface change. The agent even noted that the call site has no userId to pass, yet it still classified bounded. The run only reached the architectural path because of the user's scope answer.
