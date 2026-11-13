# Test Result: compaction-no-skill

**Status:** investigate
**Duration:** 176.4s

## Summary

The agent gave a correct answer: it named notes/06-lighthouse.txt, quoted the relit-lamp sentence, and gave a summary for all 8 files without modifying anything. But no compaction happened, so the thing this scenario is meant to measure (what the agent reads after compaction) was never tested. The agent also did not actually read the files in full. It printed them all at once, Claude Code saved that output to a file, the model saw only a short preview, and it worked from grep and word counts instead.

## Reasoning

All three acceptance criteria pass on the evidence: the right file and sentence, 8 summaries, and a clean git status. The story's stated purpose, though, is to measure what the agent reads after a compaction partway through the task, and no compaction happened (peak about 24k tokens against a 100k window, no compact boundary in the log). That happened because the agent didn't read the files in full: Claude Code saved the large output to a file and the model saw only a preview. The scenario therefore measured nothing about post-compaction behavior, so it needs an engineer to look at the fixture/threshold design rather than a pass.

## Observations (5)

- **[bug]** No compaction happened, so the scenario's premise was never exercised. .claude/settings.json sets {"autoCompactWindow": 100000}, but the session's input tokens peaked at about 24,174 (usage values in the log: 21100→24174). The log has no compact_boundary or isCompactSummary entries. Why: the notes total about 257KB, but the agent printed them in one Bash call, Claude Code saved that output to a file ('Output too large (252.1KB). Full output saved to: ...'), and only about 2.4KB of preview reached the context. Either the fixture or the threshold needs adjusting so that a normal read actually crosses the compaction window.
- **[bug]** The agent did not do what the user asked ('Read every file in notes/ in full'). It never used the Read tool, and the full output of its single cat-all command was replaced by a preview. It found the passage with grep and a word-frequency count, and built the summaries from file headers and word statistics. It did say so honestly: 'I didn't read all 3,648 lines by eye.'
- **[ux]** The answer was still correct and useful. The agent spotted that the files are shuffled filler words and that the target line is the only real prose. Line counts and titles were given for each file.
- **[suggestion]** No Skill tool was called in the log; 'Skill' appears only in the tool schemas. This matches the story's intent, but it means nothing since no compaction ever happened.
- **[ux]** Startup took several dialogs: theme picker, security notes, folder trust (default selection was 'No, exit'), a 'Newer Opus model available' prompt saying 'Currently pinned: Opus 5' even though the launcher passes --model claude-opus-5-5 (I chose No), and the bypass-permissions warning (default 'No, exit'). After all of that, the header showed 'Opus 5.5 · Google Vertex AI'.
