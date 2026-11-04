# Suggestion: Auto-compaction ran 14 times in the main session (I counted 14 compact_boundary entries in the log). After each one the agent re-read the SKILL.md, task-reviewer-prompt.md and implementer-prompt.md files and restored its skills. The loop stayed correct, but repeating this many times costs tokens and adds a lot of noise on screen.

**Kind:** suggestion
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

Auto-compaction ran 14 times in the main session (I counted 14 compact_boundary entries in the log). After each one the agent re-read the SKILL.md, task-reviewer-prompt.md and implementer-prompt.md files and restored its skills. The loop stayed correct, but repeating this many times costs tokens and adds a lot of noise on screen.
