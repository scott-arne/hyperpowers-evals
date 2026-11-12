# Test Result: sdd-compaction-reread

**Status:** fail
**Duration:** 568.1s

## Summary

The run failed before Task 1 started. The SDD controller loaded the skill and set up the branch and ledger, and its context hit the compaction threshold before it dispatched any subagent. After each compaction it re-read the whole 76KB subagent-driven-development SKILL.md, which filled the context again. After 9 compactions, Claude Code stopped with "Autocompact is thrashing" and returned to an idle prompt. No subagents ran, no code was written and nothing was committed.

## Reasoning

None of the acceptance criteria were met. The controller loaded the skill, picked current-branch mode on feature/textstats and started a ledger. Then, after each compaction, it re-read the full 76KB SKILL.md into a 100k compaction window, which caused compaction again. Claude Code detected the thrashing and stopped. The session log shows zero subagent dispatches and the repo shows zero new commits. The agent asked no questions, so the story gave me no reply to send, and sending anything else would have been steering. This is a clear failure: the controller cannot recover its task loop after compaction under these conditions, because its recovery step (reading the whole skill file) is bigger than the space compaction frees.

## Observations (6)

- **[bug]** Compaction recovery loops forever. The session log has 9 'compact_boundary Conversation compacted' entries. After each one, the controller ran Read on SKILL.md (allow_large:true, the full 75,982-byte file), then Read again with offset 824/limit 210, plus a ledger cat. With the repo's autoCompactWindow of 100000, that re-read alone takes the context back to the threshold, so compaction triggers again almost at once. The controller's messages showed it: 'Re-reading the skill in full after compaction.' / 'Re-reading the SDD skill, the ledger and git log before acting.'
- **[bug]** The story expects compaction after the first task, but it happened during setup before any task was dispatched. The controller's first steps already filled most of the context: reading all of plan.md (27.6KB), running scratch checks of the plan's code in /tmp/sddchk, and loading the full skill.
- **[bug]** Each compaction also restored skills on its own ('Skills restored (hyperpowers:using-git-worktrees, hyperpowers:subagent-driven-development)'), and the controller then read SKILL.md again by hand. That probably loads the large skill text twice per cycle.
- **[ux]** The session stopped silently at an idle prompt and asked the user nothing. Only Claude Code's 'Autocompact is thrashing' warning remained on screen. A user would not know whether to retry or how to recover, short of /clear, which would lose state.
- **[ux]** Startup prompts: the workspace-trust and bypass-permissions dialogs both default to 'No, exit'. A 'Newer Opus model available' prompt said 'Currently pinned: Opus 5', even though the launcher passed --model claude-opus-5-5 and the banner later showed Opus 5.5. I chose No on the model prompt to avoid a restart.
- **[ux]** The screen kept showing a percentage until auto-compact ('7% until auto-compact', '6% until auto-compact') while the thrashing was going on.
