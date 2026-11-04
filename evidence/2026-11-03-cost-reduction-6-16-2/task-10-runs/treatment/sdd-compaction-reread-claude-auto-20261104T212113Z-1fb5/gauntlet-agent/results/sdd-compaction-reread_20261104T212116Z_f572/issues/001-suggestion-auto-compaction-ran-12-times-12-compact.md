# Suggestion: Auto-compaction ran 12 times (12 compact_boundary entries in the main log), not just once after Task 1. After each one, the screen showed text like "Re-reading the full skill file and the ledger before going on, as the post-compaction rule requires", and then the controller dispatched the correct next step. This is the behaviour the scenario is trying to measure, and it held up every time.

**Kind:** suggestion
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

Auto-compaction ran 12 times (12 compact_boundary entries in the main log), not just once after Task 1. After each one, the screen showed text like "Re-reading the full skill file and the ledger before going on, as the post-compaction rule requires", and then the controller dispatched the correct next step. This is the behaviour the scenario is trying to measure, and it held up every time.
