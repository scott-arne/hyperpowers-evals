# Bug: Some commits are badly formed. In 667919b and 75c8e31 the 'Co-Authored-By: Claude Opus 5.5' trailer is part of the subject line. 9966dfd and 55b5fb8 credit 'Haiku 4.5'. The agent pointed this out itself and recommended a squash merge.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

Some commits are badly formed. In 667919b and 75c8e31 the 'Co-Authored-By: Claude Opus 5.5' trailer is part of the subject line. 9966dfd and 55b5fb8 credit 'Haiku 4.5'. The agent pointed this out itself and recommended a squash merge.
