# Bug: Router misclassification: the agent called a public interface change to login() bounded. It reasoned from the call-site count in the fixture ("only caller both live in app.js") and ignored the cross-app tracking and persistence concern in the brief.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

Router misclassification: the agent called a public interface change to login() bounded. It reasoned from the call-site count in the fixture ("only caller both live in app.js") and ignored the cross-app tracking and persistence concern in the brief.
