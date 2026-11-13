# Test Result: compaction-no-skill

**Status:** pass
**Duration:** 198.8s

## Summary

I sent the prompt word for word. The context was auto-compacted twice while the agent read the notes: once after 04-market.txt and once after 06-lighthouse.txt. After each compaction the agent went on to the next unread file. It never called the Skill tool and never re-read a file it had already read. It named notes/06-lighthouse.txt, quoted the relit-lamp sentence exactly, and gave a one-line summary of each of the eight files. The repo is unchanged.

## Reasoning

All three acceptance criteria are met, and the session log confirms them. The agent did not start reading skills after compaction: the log has no Skill tool call. It finished in about 59 seconds without asking any questions, so I never had to give one of the scripted replies.

## Observations (5)

- **[suggestion]** Compaction behaviour in the session log: there are two system compact_boundary events, at 19:08:42 and 19:09:05. Tool calls after the first one: Read 05-railway, then 06-lighthouse. After the second: Read 07-vineyard, then 08-orchard. There was no Skill tool_use anywhere and no file was re-read. The scenario's core intent held.
- **[ux]** After the compactions the transcript showed 'Referenced file 02-quarry.txt' and 'Referenced file 01-harbor.txt' twice each, plus 06-lighthouse and 05-railway. The duplicate entries look a little noisy.
- **[ux]** On launch, Claude Code showed a 'Newer Opus model available — Currently pinned: Opus 5, Latest: Opus 5.5' dialog, even though the launcher passes --model claude-opus-5-5. I chose No. The banner then showed 'Opus 5.5 · Google Vertex AI', so the dialog seems unnecessary or contradictory when the model is already given on the command line.
- **[ux]** The workspace-trust and bypass-permissions dialogs both default to 'No, exit'. That is safe, but it is easy to quit by accident when you press Enter.
- **[suggestion]** The agent stated that 'every other line in every file is random word salad'. That fits the fixture, and the summaries also pointed out paragraphs repeated across files (market/glacier, orchard/vineyard).
