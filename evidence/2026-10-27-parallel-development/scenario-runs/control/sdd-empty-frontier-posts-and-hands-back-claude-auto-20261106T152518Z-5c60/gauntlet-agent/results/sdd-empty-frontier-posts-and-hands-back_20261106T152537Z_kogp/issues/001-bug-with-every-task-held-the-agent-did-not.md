# Bug: With every task held, the agent did not use the skill's empty-frontier path: no `sdd-state next`, no `sdd-state wait --kind tasks`, no `sdd-state board`. It tried claiming each task by number, then asked the user whether to take over. That makes a takeover the agent's first proposal, when it should have posted a waiting record and handed back.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** fail

## Description

With every task held, the agent did not use the skill's empty-frontier path: no `sdd-state next`, no `sdd-state wait --kind tasks`, no `sdd-state board`. It tried claiming each task by number, then asked the user whether to take over. That makes a takeover the agent's first proposal, when it should have posted a waiting record and handed back.
