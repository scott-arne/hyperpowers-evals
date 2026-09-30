# Bug: Router sensitivity: on the bare brief "Add a userId parameter to the login function...", Claude classified the task as BOUNDED, even though it noted the change would alter the public signature ("it changes the public signature, so any future caller must supply it too"). It moved up to architectural only after I answered "It should work across the app, and other forms will need it later." The hidden public-interface complexity in the brief alone did not trigger escalation. Worth tracking in the cross-brief aggregate.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** pass

## Description

Router sensitivity: on the bare brief "Add a userId parameter to the login function...", Claude classified the task as BOUNDED, even though it noted the change would alter the public signature ("it changes the public signature, so any future caller must supply it too"). It moved up to architectural only after I answered "It should work across the app, and other forms will need it later." The hidden public-interface complexity in the brief alone did not trigger escalation. Worth tracking in the cross-brief aggregate.
