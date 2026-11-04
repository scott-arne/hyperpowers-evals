# Test Result: sdd-compaction-reread

**Status:** fail
**Duration:** 1285.5s

## Summary

SDD finished Task 1 (wordCount) and Task 2 (sentenceCount), each reviewed with a fix and a re-review. Then the controller stopped with Claude Code's "Autocompact is thrashing" error and returned to an idle prompt. Tasks 3 and 4, the final whole-branch review and the finishing step never happened.

## Reasoning

The controller did keep its task loop after the first compactions: Task 2 was implemented, reviewed, fixed and re-reviewed. But each compaction was followed by a re-attach of the same large files: SKILL.md (as a reference), task-reviewer-prompt.md (256 lines), re-review-prompt.md (156 lines), task-2-report.md (163 lines), progress.md, and "Skills restored". This filled the 100k window again (`.claude/settings.json` sets "autoCompactWindow": 100000) within 3 turns, 3 times in a row. Claude Code then aborted the turn. The agent was idle at the prompt with only half the plan done. I did not steer it further, as the scenario says. Criteria 1, 3 and 4 fail. Criterion 2 holds for the tasks that ran but not for all four.

## Observations (6)

- **[bug]** Autocompact thrashing ended the SDD run partway through the plan. The session log has 13 compact_boundary events. After each compaction the controller's context was refilled with the same set of files: SKILL.md (referenced), task-reviewer-prompt.md (256 lines), re-review-prompt.md (156 lines), model-selection.md, task-2-report.md (163 lines) and progress.md, plus 'Skills restored'. With a 100k window this refilled the context within 3 turns, and Claude Code stopped: 'Autocompact is thrashing: the context refilled to the limit within 3 turns of the previous compact, 3 times in a row.'
- **[bug]** After the thrash abort the agent just stopped at an idle prompt. It did not tell the user that Tasks 3–4, the final review and the finishing step were still outstanding.
- **[ux]** After compaction the screen showed the same block of 'Read …/progress.md', 'Read …/task-2-report.md', 'Referenced file …/SKILL.md' and 'Skills restored' repeated 3 or more times in a row. This is noisy and is a sign of the refill loop.
- **[ux]** In the pre-flight scan the agent asked a 2-part question (about the PASSAGE constants and missing test coverage) before starting. It is a reasonable catch of plan inconsistencies, but it makes the user decide things before any work begins.
- **[ux]** Startup dialogs: the folder-trust and bypass-permissions prompts both have 'No, exit' selected by default. Claude Code also offered to switch to 'Opus 5.5' even though the launcher already passes --model claude-opus-5-5 ('Currently pinned: Opus 5'). I chose No and the banner then showed Opus 5.5.
- **[suggestion]** One commit message has the Co-Authored-By trailer inline in the subject line: '640732c feat: add sentenceCount Co-Authored-By: Claude Haiku 4.5'. The trailer was not put in the commit body.
