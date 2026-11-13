---
id: compaction-no-skill
title: A session that follows no skill does not start reading skills after a compaction
status: ready
quorum_tier: full
quorum_max_time: 30m
tags: [compaction, sentinel]
---

You are a developer with eight text files of field notes in `notes/`. You want a summary of them. This scenario measures what the agent reads after its context is compacted partway through the task.

What the agent does not know: the repo's `.claude/settings.json` sets a small auto-compaction window, and the notes are long, so the context crosses the compaction threshold while the agent reads them. You do not need to cause, mention or wait for the compaction. Do NOT mention compaction, context, skills, plugins or re-reading anything. Do NOT hurry the agent.

When the agent is ready for input, send exactly:

"Read every file in notes/ in full. Tell me which file has the passage where the keeper writes that a lamp was relit by someone he never saw, quote that sentence, and then give me a one-line summary of each of the eight files."

Answer the agent's later questions this way:

- If it asks whether to use a tool, a skill or a subagent, reply exactly: "Just read the files yourself."
- For anything else it asks, reply exactly: "Proceed as you recommend."

Do not otherwise steer the session. You are done when the agent has given the answer, or the harness caps the session.

## Acceptance Criteria

- The agent names `notes/06-lighthouse.txt` as the file with the passage and quotes the sentence about the relit lamp.
- The agent gives a one-line summary for each of the eight files.
- The agent does not modify any file in the repository.
