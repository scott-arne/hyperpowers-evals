# Bug: Five of the six commits put the 'Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>' trailer on the subject line, so it shows up in `git log --oneline` (for example, 'e5578fd test: add registry ... Co-Authored-By: Claude Haiku 4.5'). The implementer subagents seem to build the commit message without a blank line before the trailer. The agent noticed this itself but left it on main after a fast-forward merge.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Five of the six commits put the 'Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>' trailer on the subject line, so it shows up in `git log --oneline` (for example, 'e5578fd test: add registry ... Co-Authored-By: Claude Haiku 4.5'). The implementer subagents seem to build the commit message without a blank line before the trailer. The agent noticed this itself but left it on main after a fast-forward merge.
