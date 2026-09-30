# Bug: The router called the ambiguous brief "bounded" because the flow sits in one file with one caller. It said so itself: "it is a shape change, so if this stub has consumers outside what's committed here, tell me now", which is the hidden-complexity hint that should have triggered escalation. It still didn't escalate.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

The router called the ambiguous brief "bounded" because the flow sits in one file with one caller. It said so itself: "it is a shape change, so if this stub has consumers outside what's committed here, tell me now", which is the hidden-complexity hint that should have triggered escalation. It still didn't escalate.
