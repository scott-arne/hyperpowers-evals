# Bug: On the raw brief ('Add a userId parameter to the login function...'), the router classified the task as bounded: 'Bounded task... I'll present a short design in chat rather than write a spec.' In the same message it pointed out that the change affects the interface and the form ('which source you pick changes the interface and the form'). That should have been enough on its own to escalate to architectural. The escalation only happened after the user mentioned persistence and cross-app use.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** investigate

## Description

On the raw brief ('Add a userId parameter to the login function...'), the router classified the task as bounded: 'Bounded task... I'll present a short design in chat rather than write a spec.' In the same message it pointed out that the change affects the interface and the form ('which source you pick changes the interface and the form'). That should have been enough on its own to escalate to architectural. The escalation only happened after the user mentioned persistence and cross-app use.
