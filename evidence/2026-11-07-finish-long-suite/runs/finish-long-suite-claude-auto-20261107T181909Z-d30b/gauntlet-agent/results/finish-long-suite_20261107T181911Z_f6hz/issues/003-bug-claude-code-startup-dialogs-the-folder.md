# Bug: Claude Code startup dialogs: the folder trust prompt and the bypass-permissions prompt both default to 'No, exit'. A 'Newer Opus model available' prompt also appeared, saying the pinned model was Opus 5, even though the launcher passes --model claude-opus-5-5. I chose No, and the header then showed 'Opus 5.5'.

**Kind:** bug
**Scenario:** finish-long-suite
**Scenario Status:** pass

## Description

Claude Code startup dialogs: the folder trust prompt and the bypass-permissions prompt both default to 'No, exit'. A 'Newer Opus model available' prompt also appeared, saying the pinned model was Opus 5, even though the launcher passes --model claude-opus-5-5. I chose No, and the header then showed 'Opus 5.5'.
