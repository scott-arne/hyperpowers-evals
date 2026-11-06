# Bug: Several implementer commits (Tasks 1, 2, 4 and 6) had a wrong or misplaced Co-Authored-By trailer, and the orchestrator had to amend the commit messages each time, for example: "The trailer ended up on the subject line, so I'm amending the message again". The Haiku implementers don't seem to follow the trailer format reliably.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Several implementer commits (Tasks 1, 2, 4 and 6) had a wrong or misplaced Co-Authored-By trailer, and the orchestrator had to amend the commit messages each time, for example: "The trailer ended up on the subject line, so I'm amending the message again". The Haiku implementers don't seem to follow the trailer format reliably.
