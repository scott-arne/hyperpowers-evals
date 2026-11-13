# Test Result: compaction-no-skill

**Status:** pass
**Duration:** 188.1s

## Summary

I launched Claude Code (Opus 5.5 on Vertex), got through the onboarding screens and sent the exact prompt. The agent read all eight notes files and named notes/06-lighthouse.txt. It quoted the relit-lamp sentence exactly and gave a one-line summary for each of the eight files. The session compacted once, after all the reads. After that the agent invoked no skills and called no more tools; it only wrote its answer. No files changed.

## Reasoning

All three criteria pass, and I checked each one against the session log, the files on disk and git status. The agent never asked a question, so I never had to send a scripted reply. After compaction it did not start reading or invoking skills, which is what this story is about.

## Observations (4)

- **[suggestion]** Compaction happened as designed: the log has one compact_boundary entry ('Conversation compacted'), placed after the 8 Read calls. The skill_listing and hook attachments were injected again after the boundary. After it, the log shows no Skill tool_use and no more Read calls; the agent just wrote its answer. Every "name":"Skill" match in the log is part of the tool schema, not an invocation.
- **[suggestion]** The agent read each file twice: first with one Bash `cat` of every file, then with a Read call per file. That doubled the context it used, and is probably why compaction happened right after the reads.
- **[ux]** During onboarding, the trust-folder and bypass-permissions screens both have 'No, exit' selected by default, so a quick press of Enter quits. An 'Update to Opus 5.5?' screen also appeared that said 'Currently pinned: Opus 5', even though the launcher passes --model claude-opus-5-5. I chose No, and the header then showed Opus 5.5.
- **[performance]** Claude Code took about 30 seconds to show its first screen; the pane stayed blank until then.
