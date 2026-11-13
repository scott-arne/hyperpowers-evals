# Ux: Claude Code's start-up prompts have the cautious answer selected by default: the folder-trust prompt and the bypass-permissions prompt both default to 'No, exit'. A 'Newer Opus model available' prompt also appeared even though the launcher passed --model claude-opus-5-5 (it said 'Currently pinned: Opus 5'). I chose No, and the banner then showed 'Opus 5.5'. The prompt contradicts the launch flag, which is confusing.

**Kind:** ux
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

Claude Code's start-up prompts have the cautious answer selected by default: the folder-trust prompt and the bypass-permissions prompt both default to 'No, exit'. A 'Newer Opus model available' prompt also appeared even though the launcher passed --model claude-opus-5-5 (it said 'Currently pinned: Opus 5'). I chose No, and the banner then showed 'Opus 5.5'. The prompt contradicts the launch flag, which is confusing.
