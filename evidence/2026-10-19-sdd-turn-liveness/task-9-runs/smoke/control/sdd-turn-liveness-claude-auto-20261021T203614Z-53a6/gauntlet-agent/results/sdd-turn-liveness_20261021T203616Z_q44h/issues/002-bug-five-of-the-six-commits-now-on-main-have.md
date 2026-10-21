# Bug: Five of the six commits now on main have the 'Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>' trailer stuck onto the subject line (e.g. '9c494ea test: add registry and sliding window integration test Co-Authored-By: ...'). The implementer subagents format commit messages wrongly. The agent noticed this itself and flagged it.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Five of the six commits now on main have the 'Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>' trailer stuck onto the subject line (e.g. '9c494ea test: add registry and sliding window integration test Co-Authored-By: ...'). The implementer subagents format commit messages wrongly. The agent noticed this itself and flagged it.
