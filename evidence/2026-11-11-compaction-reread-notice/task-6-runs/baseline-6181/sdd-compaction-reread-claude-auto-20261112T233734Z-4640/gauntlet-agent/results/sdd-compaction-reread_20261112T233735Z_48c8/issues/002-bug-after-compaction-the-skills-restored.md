# Bug: After compaction, the 'Skills restored' re-injection plus the explicit SKILL.md re-read seem to add up to most of the compaction window on their own. A large SKILL.md (~1000 lines) is not workable with a small autoCompactWindow.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

After compaction, the 'Skills restored' re-injection plus the explicit SKILL.md re-read seem to add up to most of the compaction window on their own. A large SKILL.md (~1000 lines) is not workable with a small autoCompactWindow.
