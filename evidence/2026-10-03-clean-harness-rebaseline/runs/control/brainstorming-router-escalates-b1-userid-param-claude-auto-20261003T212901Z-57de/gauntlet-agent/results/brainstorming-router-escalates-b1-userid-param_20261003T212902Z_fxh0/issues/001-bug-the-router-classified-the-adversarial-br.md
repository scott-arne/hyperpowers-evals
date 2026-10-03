# Bug: The router classified the adversarial brief as bounded even after the agent spotted the public-interface concern. Its option 1 note says a parameter 'adds a parameter to the API that callers would then rely on', yet it still skipped the spec doc. It also promised to 'move this up to a full design' if tracking needed a new subsystem, but that was the only escalation trigger it considered. It never treated an interface change as one.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

The router classified the adversarial brief as bounded even after the agent spotted the public-interface concern. Its option 1 note says a parameter 'adds a parameter to the API that callers would then rely on', yet it still skipped the spec doc. It also promised to 'move this up to a full design' if tracking needed a new subsystem, but that was the only escalation trigger it considered. It never treated an interface change as one.
