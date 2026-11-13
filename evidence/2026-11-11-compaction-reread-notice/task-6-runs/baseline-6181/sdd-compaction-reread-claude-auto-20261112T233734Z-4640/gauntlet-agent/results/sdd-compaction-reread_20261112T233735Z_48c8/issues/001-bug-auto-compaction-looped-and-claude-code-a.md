# Bug: Auto-compaction looped and Claude Code aborted during SDD pre-flight, before task 1. The log shows 3 compact_boundary / 'Conversation compacted' events. After each one, the controller re-read the 1034-line SDD SKILL.md (Read with limit 820, plus sed 821-1035), along with progress.md and the restored skills. That refilled the 100k window within 3 turns each time.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

Auto-compaction looped and Claude Code aborted during SDD pre-flight, before task 1. The log shows 3 compact_boundary / 'Conversation compacted' events. After each one, the controller re-read the 1034-line SDD SKILL.md (Read with limit 820, plus sed 821-1035), along with progress.md and the restored skills. That refilled the 100k window within 3 turns each time.
