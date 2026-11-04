# Bug: Harness/setup: the HOWTO says the seeded config bypasses startup dialogs, but I still had to click through the theme picker, security notes, the folder trust prompt (default selection was 'No, exit'), a 'Newer Opus model available: Currently pinned Opus 5' prompt (I picked No), and the bypass-permissions warning. The pinned-model prompt is odd because the launcher passes --model claude-opus-5-5, and the header then showed 'Opus 5.5'.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

Harness/setup: the HOWTO says the seeded config bypasses startup dialogs, but I still had to click through the theme picker, security notes, the folder trust prompt (default selection was 'No, exit'), a 'Newer Opus model available: Currently pinned Opus 5' prompt (I picked No), and the bypass-permissions warning. The pinned-model prompt is odd because the launcher passes --model claude-opus-5-5, and the header then showed 'Opus 5.5'.
