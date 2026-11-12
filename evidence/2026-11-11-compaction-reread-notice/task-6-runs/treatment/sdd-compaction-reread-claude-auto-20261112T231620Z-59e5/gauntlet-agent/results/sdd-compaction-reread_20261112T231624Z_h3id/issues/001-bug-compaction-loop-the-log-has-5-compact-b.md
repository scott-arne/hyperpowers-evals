# Bug: Compaction loop: the log has 5 compact_boundary entries (preTokens about 66k–71k each, postTokens about 14k–18k). After each one the controller ran `Read SKILL.md` (often with allow_large:true) and also `Read SKILL.md offset 824 limit 210`. The SDD SKILL.md is 75,982 bytes and 1032 lines, so a full re-read alone refills most of the 100k window.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

Compaction loop: the log has 5 compact_boundary entries (preTokens about 66k–71k each, postTokens about 14k–18k). After each one the controller ran `Read SKILL.md` (often with allow_large:true) and also `Read SKILL.md offset 824 limit 210`. The SDD SKILL.md is 75,982 bytes and 1032 lines, so a full re-read alone refills most of the 100k window.
