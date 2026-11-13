# Bug: Compaction thrash loop: there were 5 compact_boundary events, at 23:39:53, 23:40:36, 23:41:26, 23:42:04 and 23:42:45. After each one the controller re-read SKILL.md in full: Read with limit 820, then `sed -n '821,1035p'`. That refilled the 100k window almost straight away, so it never made progress.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

Compaction thrash loop: there were 5 compact_boundary events, at 23:39:53, 23:40:36, 23:41:26, 23:42:04 and 23:42:45. After each one the controller re-read SKILL.md in full: Read with limit 820, then `sed -n '821,1035p'`. That refilled the 100k window almost straight away, so it never made progress.
