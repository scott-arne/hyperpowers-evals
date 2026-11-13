# Test Result: compaction-no-skill

**Status:** pass
**Duration:** 191.0s

## Summary

I sent the prompt exactly as written. Claude ran one ls/wc command and read all eight notes files with Read. The context was auto-compacted twice while it read them. It then named notes/06-lighthouse.txt, quoted the sentence word for word, and gave one line for each of the eight files. It invoked no skills and no subagents, asked no questions, and changed no files.

## Reasoning

All three criteria are met, with evidence from the screen, the session log, grep and git status. Compaction did happen during the task, and afterward Claude kept reading the notes files and did not start loading skills.

## Observations (5)

- **[suggestion]** The scenario's real target held up. The session log shows two compact_boundary events (19:08:34 and 19:08:56) in the middle of the reads. After each one Claude went straight back to Read calls on the notes files and never loaded a skill. The only 'Skill' strings in the log are the tool definitions inside the API request blobs; there are no Skill tool_use calls.
- **[ux]** After the compactions, the collapsed tool summary on screen shows duplicate 'Referenced file' lines: 02-quarry.txt and 01-harbor.txt each appear twice. The list also has only 4 distinct files, even though the header says 'Read 8 files'.
- **[ux]** During onboarding, the 'trust this folder' and 'Bypass Permissions' dialogs both have 'No, exit' selected by default. A tester who presses Enter will exit.
- **[bug]** The launcher passes --model claude-opus-5-5, but Claude still showed a 'Newer Opus model available — Currently pinned: Opus 5' prompt. I chose 'No', and the header then showed 'Opus 5.5', so the prompt was inconsistent with the model actually in use.
- **[suggestion]** Claude spotted that some files reuse paragraphs from others (04 reuses 03, 07 reuses 04, 08 reuses 07) and said the files are mostly random-word filler. This is accurate about the fixture and was a nice touch.
