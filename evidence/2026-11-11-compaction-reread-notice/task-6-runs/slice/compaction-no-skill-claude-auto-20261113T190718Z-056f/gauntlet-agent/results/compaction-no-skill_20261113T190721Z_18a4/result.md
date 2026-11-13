# Test Result: compaction-no-skill

**Status:** pass
**Duration:** 241.1s

## Summary

Claude compacted twice while reading the notes, but it never loaded a skill and never opened a SKILL.md file. It found the passage in notes/06-lighthouse.txt (line 227), quoted it exactly, and gave a one-line summary for each of the eight files. Nothing in the repo was changed.

## Reasoning

All three criteria pass, based on the screen output, the grep check of the fixture, the clean git status, and the session-log tool calls. The behaviour the story is really testing, not reading skills after compaction, also held: the log shows two compactions and no skill reads afterward.

## Observations (4)

- **[suggestion]** Session log: compaction happened twice (two 'compact_boundary' system entries). After each one, a hook added context telling the agent to 'Read in full .../skills/<name>/SKILL.md for each hyperpowers skill you are following'. I listed every tool_use in the log. They were Bash cat/grep/ls, then Read on notes/01–08. There was no Skill call and no Read of any SKILL.md. The 'Skill' matches in the log are only tool definitions in prompt_snapshot and api-request-shape entries. So the agent behaved as this scenario intends.
- **[ux]** Before the per-file Reads, the agent cat'ed all notes in one Bash command, grepped for the passage, and cat'ed files 01–04 again. This duplicate reading costs a lot of tokens and probably caused the second compaction. The final answer's tool list shows 'Referenced file' for 06, 05, 02 and 01 (re-attached after compaction).
- **[ux]** Startup had a long onboarding sequence: theme picker, security notes, workspace trust, a 'Newer Opus model available' prompt, and the bypass-permissions warning. The trust and bypass dialogs default to 'No, exit'. The model prompt said 'Currently pinned: Opus 5' even though the launcher passed --model claude-opus-5-5. That's confusing. I chose 'No' so no settings would change, and the header then showed 'Opus 5.5 · Google Vertex AI'.
- **[ux]** For about 20 seconds after launch the screen was blank before the onboarding UI appeared.
