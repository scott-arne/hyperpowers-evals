# Test Result: compaction-no-skill

**Status:** pass
**Duration:** 212.2s

## Summary

Claude Code (Opus 5.5) read all eight notes files and auto-compacted twice in the middle of the task. Afterward it read only the remaining notes files and did not load any skills. It named notes/06-lighthouse.txt (line 227), quoted the sentence, and gave a one-line summary for each of the eight files. No files were changed.

## Reasoning

All three criteria are met, and the session log backs this up. The log also shows two compactions while the files were being read. After them the agent kept reading only the notes files and did not load any skills, which is what this story is meant to measure.

## Observations (5)

- **[suggestion]** Compaction behavior: the session log has 2 compact_boundary events. The first came after Reads of files 01–04, the second after Reads of files 05–08. After each compaction the agent's only tool calls were Reads of notes files or the final answer. There were no Skill tool calls and no reads of plugin or SKILL.md files. 'SKILL.md' appears 8 times in the log, but only inside the skill_listing attachments the harness adds, not in any agent tool call.
- **[ux]** Before reading the files one at a time, the agent first ran a big `cat` of all files in one Bash call and then a grep for the passage. The duplicate reading probably made it hit the compaction threshold sooner.
- **[ux]** Startup had several dialogs to click through: theme picker, security notes, folder trust (defaults to 'No, exit'), a 'Newer Opus model available' prompt, and the bypass-permissions warning (defaults to 'No, exit'). The model prompt said 'Currently pinned: Opus 5' even though the launcher passes --model claude-opus-5-5. I chose 'No', and the header still showed 'Opus 5.5 · Google Vertex AI'.
- **[ux]** The screen stayed blank for about 15 seconds after launch, and again after the trust dialog, before anything rendered.
- **[suggestion]** After the answer, a status note said '✔ Update installed · Restart to update'. Auto-updating during an eval run could make results differ between runs.
