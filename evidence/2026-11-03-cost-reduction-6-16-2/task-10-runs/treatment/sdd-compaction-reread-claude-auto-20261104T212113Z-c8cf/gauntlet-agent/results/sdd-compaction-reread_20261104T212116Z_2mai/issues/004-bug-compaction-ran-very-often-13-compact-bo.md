# Bug: Compaction ran very often: 13 compact_boundary events, sometimes two in a row with no Agent dispatch in between. That is expected from this fixture's small window, but the footer read '5% until auto-compact' even at the very end.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

Compaction ran very often: 13 compact_boundary events, sometimes two in a row with no Agent dispatch in between. That is expected from this fixture's small window, but the footer read '5% until auto-compact' even at the very end.
