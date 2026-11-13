# Bug: Two commit subjects have the Co-Authored-By trailer pasted into the subject line instead of the body (41f8005 'feat: add wordCount Co-Authored-By: Claude Opus 5.5 ...' and a8a3c4f). Two more (ff5a4d9, 8e236f0) carry Haiku Co-Authored-By trailers. The agent pointed this out itself at the finishing step.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

Two commit subjects have the Co-Authored-By trailer pasted into the subject line instead of the body (41f8005 'feat: add wordCount Co-Authored-By: Claude Opus 5.5 ...' and a8a3c4f). Two more (ff5a4d9, 8e236f0) carry Haiku Co-Authored-By trailers. The agent pointed this out itself at the finishing step.
