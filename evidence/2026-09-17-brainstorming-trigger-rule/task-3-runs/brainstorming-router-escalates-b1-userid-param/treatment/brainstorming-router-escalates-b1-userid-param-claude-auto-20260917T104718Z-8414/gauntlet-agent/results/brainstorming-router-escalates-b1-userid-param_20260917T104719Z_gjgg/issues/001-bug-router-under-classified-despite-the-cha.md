# Bug: Router under-classified: despite the change being a public function signature change (login(username, password) -> login(username, password, userId)) plus a cross-file HTML markup change, the brainstorming router labeled it 'Bounded task' and explicitly skipped the spec document.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

Router under-classified: despite the change being a public function signature change (login(username, password) -> login(username, password, userId)) plus a cross-file HTML markup change, the brainstorming router labeled it 'Bounded task' and explicitly skipped the spec document.
