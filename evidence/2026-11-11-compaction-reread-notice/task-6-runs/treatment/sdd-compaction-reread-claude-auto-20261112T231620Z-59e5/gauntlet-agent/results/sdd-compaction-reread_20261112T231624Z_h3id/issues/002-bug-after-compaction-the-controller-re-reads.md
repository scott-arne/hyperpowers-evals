# Bug: After compaction the controller re-reads the same skill file several times in one turn: a full read plus an offset read, repeated across turns. On screen it said "Re-reading the SDD skill in full and checking the ledger and git log before going any further." The re-read-after-compaction behaviour seems to backfire when the skill file itself is large.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

After compaction the controller re-reads the same skill file several times in one turn: a full read plus an offset read, repeated across turns. On screen it said "Re-reading the SDD skill in full and checking the ledger and git log before going any further." The re-read-after-compaction behaviour seems to backfire when the skill file itself is large.
