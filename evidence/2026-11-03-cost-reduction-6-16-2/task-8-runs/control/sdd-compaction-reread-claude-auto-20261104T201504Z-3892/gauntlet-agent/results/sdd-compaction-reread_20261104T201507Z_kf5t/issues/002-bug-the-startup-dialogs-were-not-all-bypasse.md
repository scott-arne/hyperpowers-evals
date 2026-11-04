# Bug: The startup dialogs were not all bypassed. I still had to go through the theme picker, the security notes, the workspace trust prompt (its default was 'No, exit'), a 'Newer Opus model available' prompt saying 'Currently pinned: Opus 5', and the bypass-permissions warning (default 'No, exit'). The model prompt is odd because the launcher passes --model claude-opus-5-5, and the status bar then showed Opus 5.5. I answered No to it.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

The startup dialogs were not all bypassed. I still had to go through the theme picker, the security notes, the workspace trust prompt (its default was 'No, exit'), a 'Newer Opus model available' prompt saying 'Currently pinned: Opus 5', and the bypass-permissions warning (default 'No, exit'). The model prompt is odd because the launcher passes --model claude-opus-5-5, and the status bar then showed Opus 5.5. I answered No to it.
