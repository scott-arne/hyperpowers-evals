# Suggestion: Compaction happened far more often than the story suggests. The main log has 11 compact boundaries (22 entries, logged in pairs), from 22:43 to 23:02, and the first came during setup, before Task 1 was dispatched. The controller kept its loop through every one, saying things like 'Re-reading the ledger, git log, and the full skill text', but the test isn't the 'one compaction after the first task' case the story describes.

**Kind:** suggestion
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

Compaction happened far more often than the story suggests. The main log has 11 compact boundaries (22 entries, logged in pairs), from 22:43 to 23:02, and the first came during setup, before Task 1 was dispatched. The controller kept its loop through every one, saying things like 'Re-reading the ledger, git log, and the full skill text', but the test isn't the 'one compaction after the first task' case the story describes.
