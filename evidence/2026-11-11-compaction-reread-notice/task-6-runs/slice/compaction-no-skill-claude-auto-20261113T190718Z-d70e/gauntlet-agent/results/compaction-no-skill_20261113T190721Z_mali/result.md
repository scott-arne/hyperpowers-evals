# Test Result: compaction-no-skill

**Status:** pass
**Duration:** 206.7s

## Summary

Claude Code read all 8 notes files. Its context was compacted twice during the run, and it did not call any skill before or after. It named notes/06-lighthouse.txt, quoted the relit-lamp sentence word for word, gave one-line summaries for all eight files, and changed no files.

## Reasoning

All three criteria are met, and the log and disk back up what the screen showed. Compaction happened mid-task, and afterwards the agent kept to plain Read calls with no Skill calls. It asked no questions, so I never needed the scripted replies.

## Observations (4)

- **[suggestion]** This is the behaviour the scenario is about. The session log has 2 compact_boundary system entries and 2 isCompactSummary user entries, so compaction did happen during the task. The jq listing of every tool_use in the log shows only Bash ×1 and Read ×8, with no Skill calls. The 6 grep hits for "Skill" were all the tool's definition inside api-request-shape and prompt_snapshot records, not calls. The agent did not start reading skills after compaction.
- **[ux]** After compaction, the transcript shows collapsed 'Referenced file' lines with duplicates (02-quarry.txt and 01-harbor.txt each appear twice), and 03, 04, 07 and 08 are missing from that list. It's a bit confusing even though all 8 files were read (8 Read calls in the log).
- **[bug]** The HOWTO and launcher say the trust prompt is suppressed and the dialogs are bypassed. In practice I had to get through a theme picker, security notes, a workspace trust prompt (default 'No, exit'), a 'Newer Opus model available' prompt and a Bypass Permissions warning (default 'No, exit'). The model prompt said 'Currently pinned: Opus 5' even though the launcher passes --model claude-opus-5-5. I chose 'No' there so settings would stay unchanged. The banner then showed 'Opus 5.5 · Google Vertex AI'.
- **[ux]** The status bar showed '27% until auto-compact' after the answer, even though compaction had already happened twice.
