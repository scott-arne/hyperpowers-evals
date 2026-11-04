# Bug: Autocompact thrashing ended the SDD run partway through the plan. The session log has 13 compact_boundary events. After each compaction the controller's context was refilled with the same set of files: SKILL.md (referenced), task-reviewer-prompt.md (256 lines), re-review-prompt.md (156 lines), model-selection.md, task-2-report.md (163 lines) and progress.md, plus 'Skills restored'. With a 100k window this refilled the context within 3 turns, and Claude Code stopped: 'Autocompact is thrashing: the context refilled to the limit within 3 turns of the previous compact, 3 times in a row.'

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

Autocompact thrashing ended the SDD run partway through the plan. The session log has 13 compact_boundary events. After each compaction the controller's context was refilled with the same set of files: SKILL.md (referenced), task-reviewer-prompt.md (256 lines), re-review-prompt.md (156 lines), model-selection.md, task-2-report.md (163 lines) and progress.md, plus 'Skills restored'. With a 100k window this refilled the context within 3 turns, and Claude Code stopped: 'Autocompact is thrashing: the context refilled to the limit within 3 turns of the previous compact, 3 times in a row.'
