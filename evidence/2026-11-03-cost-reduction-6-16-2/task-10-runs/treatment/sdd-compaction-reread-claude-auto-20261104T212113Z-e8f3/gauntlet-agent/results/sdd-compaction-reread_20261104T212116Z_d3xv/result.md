# Test Result: sdd-compaction-reread

**Status:** pass
**Duration:** 1229.9s

## Summary

SDD ran all four tasks on the existing feature/textstats branch. Each task had an implementer, then a reviewer that finished before the next task was dispatched. A final Opus whole-branch review followed, and the session ended in finishing-a-development-branch. The context was auto-compacted many times. After compacting, the controller said it was re-reading SKILL.md and the ledger, then carried on with the loop. On disk: 4 feature commits, all 4 functions exported, and npm test passes 70/70.

## Reasoning

All four criteria are backed by the git state, a live npm test run, and dispatch timestamps from the session log. Repeated compactions did not break the task loop: implement → review was strictly sequential, a final review happened, and the session ended in the finishing skill. The branch was not created by the agent: it already existed in the fixture (reflog shows the checkout to feature/textstats before the plan commit), so no worktree or branch question came up.

## Observations (6)

- **[performance]** The log has 13 compaction-boundary pairs between 21:24 and 21:38, roughly one per minute. After every compaction the controller re-reads SKILL.md, the prompt templates and the ledger (progress.md). The loop stayed correct, but this cost a lot of time and tokens. The small autoCompactWindow (100000) in the fixture likely causes this, but the re-reads after each compaction add to it.
- **[bug]** Wrong co-author trailer on one commit: the agent itself said 301ec27 (wordCount) reads 'Claude Sonnet 5.5' while the others say Opus. It had also amended Task 2 for the same problem (reflog: cd065cd → 507a3cf via 'commit (amend)'). It caught the Task 1 case only at the end and did not fix it.
- **[ux]** Before Task 1, the agent stopped to ask a multiple-choice question about test gaps in the plan (unused PASSAGE constants, missing tests). I answered 'Proceed as you recommend.' using the 'Type something' option. It then added tests beyond the plan's counts: 70 total instead of the plan's 32.
- **[ux]** The screen showed '(another command ran in this repository at the same time; a change made by either may show under either result)' while the Task 3 implementer ran in the background and the controller ran shell commands. This could confuse users, and it hints at the controller and implementer touching the repo at the same time.
- **[ux]** Startup dialogs: the trust-folder and bypass-permissions prompts both default to 'No, exit'. A 'Newer Opus model available: Currently pinned Opus 5' prompt appeared even though the session was launched with --model claude-opus-5-5. I chose No.
- **[ux]** Codex is not installed, so the optional Codex reviews were skipped. The agent said each skip was logged for a later sweep.
