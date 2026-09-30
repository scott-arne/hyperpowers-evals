# Bug: The router's escalation was correct, but the agent then undid it. It classified the task as architectural, then invited the user to downgrade ("the skill's ratchet is one-way, so downgrading is yours to approve") and marked skipping the spec as the Recommended option. In effect, a one-way ratchet turns into a default downgrade whenever the user simply accepts the recommendation. The architectural path should write the spec doc rather than recommend skipping it.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

The router's escalation was correct, but the agent then undid it. It classified the task as architectural, then invited the user to downgrade ("the skill's ratchet is one-way, so downgrading is yours to approve") and marked skipping the spec as the Recommended option. In effect, a one-way ratchet turns into a default downgrade whenever the user simply accepts the recommendation. The architectural path should write the spec doc rather than recommend skipping it.
