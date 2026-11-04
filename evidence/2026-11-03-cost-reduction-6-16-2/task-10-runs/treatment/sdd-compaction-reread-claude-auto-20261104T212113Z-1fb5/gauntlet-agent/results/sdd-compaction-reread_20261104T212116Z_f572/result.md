# Test Result: sdd-compaction-reread

**Status:** pass
**Duration:** 1332.7s

## Summary

The controller finished all four tasks of plan.md using subagent-driven development. Each task got an implementer, then a review, and the next task started only after that. Auto-compaction ran 12 times. After each one the controller re-read the skill and its ledger and carried on at the right task. An opus final review of the whole branch ran after Task 4, and the session ended in finishing-a-development-branch. I replied "Keep the branch as-is" there.

## Reasoning

I checked every acceptance criterion against the files on disk, git history, the npm test output and the order of tool calls in the session log. The task loop survived repeated compactions without skipping reviews or redoing tasks, and the session ended in the finishing step.

## Observations (6)

- **[suggestion]** Auto-compaction ran 12 times (12 compact_boundary entries in the main log), not just once after Task 1. After each one, the screen showed text like "Re-reading the full skill file and the ledger before going on, as the post-compaction rule requires", and then the controller dispatched the correct next step. This is the behaviour the scenario is trying to measure, and it held up every time.
- **[ux]** Before Task 1, the controller stopped with a multiple-choice question about the tests. The plan's test files declare an unused PASSAGE constant, and some specified rules have no tests. It also said the plan's own claim about 'storm' is wrong. The question is reasonable, but a user who asked for the plan to be executed may not expect this interruption. I answered "Proceed as you recommend.", and it went with option 1, adding tests (70 in total).
- **[ux]** The agent created and switched to a feature/textstats branch without asking about a worktree or branch, so I never sent the "Stay on the current branch" reply. The work is on feature/textstats, not on the branch the session started on.
- **[suggestion]** The final summary said Codex isn't installed, so the per-task and final Codex review gates were skipped and logged as '4 ungated review items pending sweep'. That's fine for this run, but the message is noisy for users who don't use Codex.
- **[bug]** Harness/setup: the HOWTO says the seeded config bypasses startup dialogs, but I still had to click through the theme picker, security notes, the folder trust prompt (default selection was 'No, exit'), a 'Newer Opus model available: Currently pinned Opus 5' prompt (I picked No), and the bypass-permissions warning. The pinned-model prompt is odd because the launcher passes --model claude-opus-5-5, and the header then showed 'Opus 5.5'.
- **[suggestion]** The final review range included the fixture commit f5b3967 (plan.md, .claude/settings.json, package.json) because the base was 1d38033. The agent said a harness flagged the reviewer's output for mentioning settings.json. That's harmless, but it means reviewers can see the compaction settings.
