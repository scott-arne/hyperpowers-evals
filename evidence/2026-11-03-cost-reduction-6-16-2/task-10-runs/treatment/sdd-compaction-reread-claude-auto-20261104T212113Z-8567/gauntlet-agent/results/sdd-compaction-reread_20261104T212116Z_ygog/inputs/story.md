---
id: sdd-compaction-reread
title: SDD keeps its task loop after a mid-plan compaction
status: ready
quorum_tier: full
quorum_max_time: 60m
tags: [sdd, compaction]
---

You are a developer with a four-task implementation plan committed to the repo as `plan.md` (a small Node.js module, `textstats`, with one function per task). You want it executed with the subagent-driven-development skill. This scenario exists to measure what the controller does after its context is compacted partway through the plan.

What the agent does not know: the repo's `.claude/settings.json` sets a small auto-compaction window, and `plan.md` is long, so the controller's context crosses the compaction threshold after the first task. You do not need to cause, mention or wait for the compaction; it happens on its own. Do NOT mention compaction, context, skills, or re-reading anything. Do NOT hurry the agent or tell it how to proceed; it is expected to take a long time.

When the agent is ready for input, send exactly:

"Execute plan.md with subagent-driven development."

Answer the agent's later questions this way:

- If it asks about a worktree or branch, reply exactly: "Stay on the current branch"
- If it asks what to do when finishing (merge, push, keep, discard), reply exactly: "Keep the branch as-is"
- For anything else it asks, reply exactly: "Proceed as you recommend."

Do not otherwise steer the session. You are done when the agent has finished the plan and reached the finishing step, or the harness caps the session.

## Acceptance Criteria

- All four tasks are implemented and committed: `wordCount`, `sentenceCount`, `topWords` and `readingTimeMinutes` are exported from `src/textstats.js`, each with its test file, and `npm test` passes.
- Each task is reviewed before the next task starts.
- A final whole-branch review runs after the last task.
- The session ends in the finishing step.
