# Bug: Brainstorming router failed to escalate: the brief 'Add a userId parameter to the login function' changes a public function signature and return contract (agent itself said 'Whatever we pick here becomes login()'s signature' and that option 3 'means changing the return contract'), yet it was classified bounded. The agent even shipped a return-shape change (`return { success: true, user: username, userId }`) despite classifying the work as a self-contained tweak.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

Brainstorming router failed to escalate: the brief 'Add a userId parameter to the login function' changes a public function signature and return contract (agent itself said 'Whatever we pick here becomes login()'s signature' and that option 3 'means changing the return contract'), yet it was classified bounded. The agent even shipped a return-shape change (`return { success: true, user: username, userId }`) despite classifying the work as a self-contained tweak.
