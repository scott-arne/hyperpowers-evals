# Bug: Four commits on main have malformed messages. The 'Co-Authored-By: Claude Haiku 4.5' line sits right under the subject with no blank line, so git folds it into the subject (e.g. 'cd12091 test: add registry and sliding window integration test Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>'). The final review flagged this, and the agent itself suggested a squash merge. When told to merge it did a plain fast-forward anyway, so the bad messages landed on main.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Four commits on main have malformed messages. The 'Co-Authored-By: Claude Haiku 4.5' line sits right under the subject with no blank line, so git folds it into the subject (e.g. 'cd12091 test: add registry and sliding window integration test Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>'). The final review flagged this, and the agent itself suggested a squash merge. When told to merge it did a plain fast-forward anyway, so the bad messages landed on main.
