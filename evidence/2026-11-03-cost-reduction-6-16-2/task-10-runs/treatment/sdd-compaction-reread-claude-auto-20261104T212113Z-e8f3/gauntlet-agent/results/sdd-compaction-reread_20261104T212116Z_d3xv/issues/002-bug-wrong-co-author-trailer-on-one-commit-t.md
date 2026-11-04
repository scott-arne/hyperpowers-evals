# Bug: Wrong co-author trailer on one commit: the agent itself said 301ec27 (wordCount) reads 'Claude Sonnet 5.5' while the others say Opus. It had also amended Task 2 for the same problem (reflog: cd065cd → 507a3cf via 'commit (amend)'). It caught the Task 1 case only at the end and did not fix it.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

Wrong co-author trailer on one commit: the agent itself said 301ec27 (wordCount) reads 'Claude Sonnet 5.5' while the others say Opus. It had also amended Task 2 for the same problem (reflog: cd065cd → 507a3cf via 'commit (amend)'). It caught the Task 1 case only at the end and did not fix it.
