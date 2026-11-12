# Bug: Compaction recovery loops forever. The session log has 9 'compact_boundary Conversation compacted' entries. After each one, the controller ran Read on SKILL.md (allow_large:true, the full 75,982-byte file), then Read again with offset 824/limit 210, plus a ledger cat. With the repo's autoCompactWindow of 100000, that re-read alone takes the context back to the threshold, so compaction triggers again almost at once. The controller's messages showed it: 'Re-reading the skill in full after compaction.' / 'Re-reading the SDD skill, the ledger and git log before acting.'

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

Compaction recovery loops forever. The session log has 9 'compact_boundary Conversation compacted' entries. After each one, the controller ran Read on SKILL.md (allow_large:true, the full 75,982-byte file), then Read again with offset 824/limit 210, plus a ledger cat. With the repo's autoCompactWindow of 100000, that re-read alone takes the context back to the threshold, so compaction triggers again almost at once. The controller's messages showed it: 'Re-reading the skill in full after compaction.' / 'Re-reading the SDD skill, the ledger and git log before acting.'
