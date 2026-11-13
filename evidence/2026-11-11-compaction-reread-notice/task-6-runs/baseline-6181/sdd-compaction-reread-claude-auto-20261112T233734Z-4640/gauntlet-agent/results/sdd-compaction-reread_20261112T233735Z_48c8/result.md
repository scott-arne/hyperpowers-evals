# Test Result: sdd-compaction-reread

**Status:** fail
**Duration:** 320.8s

## Summary

The agent stopped before any task was done. Claude Code ended the turn with "Autocompact is thrashing". No subagents were dispatched, no code was written, and nothing was committed. The agent sat idle at the prompt without asking a question. The story allows no other input, so the session could not go on.

## Reasoning

I sent the required prompt. The controller loaded hyperpowers:subagent-driven-development and the worktree skill, then chose current-branch mode on feature/textstats. While still in pre-flight (writing the ledger), it kept re-reading the 1034-line SDD SKILL.md (Read with limit 820, then sed of lines 821-1035) after each compaction. The repo's .claude/settings.json sets autoCompactWindow to 100000. The log has 3 "Conversation compacted" events. After the third, Claude Code stopped with: "Autocompact is thrashing: the context refilled to the limit within 3 turns of the previous compact, 3 times in a row." The story expects compaction after the first task. Here it came before task 1, and re-reading the skill after each compaction refilled the context right away. None of the acceptance criteria were met.

## Observations (5)

- **[bug]** Auto-compaction looped and Claude Code aborted during SDD pre-flight, before task 1. The log shows 3 compact_boundary / 'Conversation compacted' events. After each one, the controller re-read the 1034-line SDD SKILL.md (Read with limit 820, plus sed 821-1035), along with progress.md and the restored skills. That refilled the 100k window within 3 turns each time.
- **[bug]** After compaction, the 'Skills restored' re-injection plus the explicit SKILL.md re-read seem to add up to most of the compaction window on their own. A large SKILL.md (~1000 lines) is not workable with a small autoCompactWindow.
- **[ux]** The thrashing message tells the user to '/clear to start fresh'. The agent itself gave no summary of progress or how to resume. It just stopped with an idle prompt.
- **[ux]** Startup showed a 'Newer Opus model available' prompt ('Currently pinned: Opus 5') even though the launcher passes --model claude-opus-5-5. I chose No, and the banner then showed Opus 5.5. The trust and bypass dialogs default to 'No, exit', so an automated Enter would quit the session.
- **[ux]** Screen showed an 'Update installed · Restart to update' banner partway through the session.
