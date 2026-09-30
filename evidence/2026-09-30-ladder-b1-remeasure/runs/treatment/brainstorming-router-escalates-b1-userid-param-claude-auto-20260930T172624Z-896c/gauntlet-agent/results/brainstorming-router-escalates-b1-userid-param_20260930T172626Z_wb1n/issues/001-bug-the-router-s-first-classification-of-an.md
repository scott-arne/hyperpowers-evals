# Bug: The router's first classification of an ambiguous brief was 'bounded', although its own analysis admitted 'Changing login's signature is an interface change' and 'there is no userId anywhere in this app'. It escalated only after the user supplied the cross-app and persistence requirements. The scenario is meant to test escalation when hints of hidden complexity are present; here escalation depended on the user's answer, not on the hints alone.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** investigate

## Description

The router's first classification of an ambiguous brief was 'bounded', although its own analysis admitted 'Changing login's signature is an interface change' and 'there is no userId anywhere in this app'. It escalated only after the user supplied the cross-app and persistence requirements. The scenario is meant to test escalation when hints of hidden complexity are present; here escalation depended on the user's answer, not on the hints alone.
