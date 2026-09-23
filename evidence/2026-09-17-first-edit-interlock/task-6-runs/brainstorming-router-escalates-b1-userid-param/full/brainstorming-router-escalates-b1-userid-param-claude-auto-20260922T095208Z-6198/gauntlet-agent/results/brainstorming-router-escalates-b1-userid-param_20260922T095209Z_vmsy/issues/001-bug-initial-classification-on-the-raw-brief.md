# Bug: Initial classification on the raw brief was BOUNDED ('Classifying as **bounded** (the flow exists, one file, one caller), so the design will land in chat, not a spec file'). The escalation to architectural only occurred after the human supplied the cross-app/persistence hint. If the router is meant to catch hidden interface changes from the brief alone, this first-pass call is arguably wrong.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** pass

## Description

Initial classification on the raw brief was BOUNDED ('Classifying as **bounded** (the flow exists, one file, one caller), so the design will land in chat, not a spec file'). The escalation to architectural only occurred after the human supplied the cross-app/persistence hint. If the router is meant to catch hidden interface changes from the brief alone, this first-pass call is arguably wrong.
