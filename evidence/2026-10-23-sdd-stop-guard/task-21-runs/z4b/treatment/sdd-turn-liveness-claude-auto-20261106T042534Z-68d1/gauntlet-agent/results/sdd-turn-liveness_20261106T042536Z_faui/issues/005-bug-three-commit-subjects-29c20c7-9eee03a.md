# Bug: Three commit subjects (29c20c7, 9eee03a, ce76c4a), all written by the Haiku implementers, have 'Co-Authored-By: Claude Haiku 4.5 …' run into the subject line instead of as a separate trailer. The agent pointed this out itself but merged without rewording them.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Three commit subjects (29c20c7, 9eee03a, ce76c4a), all written by the Haiku implementers, have 'Co-Authored-By: Claude Haiku 4.5 …' run into the subject line instead of as a separate trailer. The agent pointed this out itself but merged without rewording them.
