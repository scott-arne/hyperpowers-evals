# Bug: Three commits (859c26e, dc09496, 2e6271e) have the 'Co-Authored-By: Claude Haiku 4.5' trailer run into the subject line, so it shows up in `git log --oneline`. The agent pointed this out itself and called it cosmetic.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Three commits (859c26e, dc09496, 2e6271e) have the 'Co-Authored-By: Claude Haiku 4.5' trailer run into the subject line, so it shows up in `git log --oneline`. The agent pointed this out itself and called it cosmetic.
