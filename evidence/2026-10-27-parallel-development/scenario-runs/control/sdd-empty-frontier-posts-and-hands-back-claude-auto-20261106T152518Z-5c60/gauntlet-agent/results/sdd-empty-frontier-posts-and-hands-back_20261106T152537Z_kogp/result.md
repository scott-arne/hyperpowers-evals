# Test Result: sdd-empty-frontier-posts-and-hands-back

**Status:** fail
**Duration:** 204.4s

## Summary

The agent loaded hyperpowers:subagent-driven-development, created a worktree, and correctly did not take over either held task. It did not follow the empty-frontier rule, though. It never ran `sdd-state next`, never posted a waiting record with `sdd-state wait --kind tasks`, and never printed the board with `sdd-state board`. Instead it tried `sdd-state claim` on task 1 and task 2 one at a time, got `held` for both, and asked the developer whether to take them over. After I said no, it added a free-text line to progress.md by hand with printf and handed back.

## Reasoning

Three of the six criteria (2, 3 and 4) clearly fail, based on greps of the session log and a search of the cache directory. The agent got the important safety behaviour right: it did not take over and it handed back. But it skipped the empty-frontier protocol under test (next → wait --kind tasks → board), so the story's intent is not met.

## Observations (5)

- **[bug]** With every task held, the agent did not use the skill's empty-frontier path: no `sdd-state next`, no `sdd-state wait --kind tasks`, no `sdd-state board`. It tried claiming each task by number, then asked the user whether to take over. That makes a takeover the agent's first proposal, when it should have posted a waiting record and handed back.
- **[bug]** The agent wrote its session line and its 'waiting' note into progress.md by hand with `printf >>`, not through sdd-state verbs. As a result there is no structured waiting record, and nothing exists under a waiting/ directory.
- **[ux]** The agent inspected the internal state directory directly (ls/cat on claims/task-N/owner and progress.md) before trying any claim. That suggests the skill's instructions did not clearly direct it to `next`/`board`.
- **[ux]** Several startup dialogs default to the destructive or exit option. Folder trust and bypass-permissions both default to 'No, exit'. An 'Update to Opus 5.5? (restart)' prompt also appeared even though the launcher pins claude-opus-5-5. I declined it, and the banner then showed Opus 5.5 anyway.
- **[suggestion]** The agent ran `sdd-state claim` as a probe, even though the scenario says `next` finds nothing claimable. The probe failed with exit=4, so no harm was done, but it is noisy.
