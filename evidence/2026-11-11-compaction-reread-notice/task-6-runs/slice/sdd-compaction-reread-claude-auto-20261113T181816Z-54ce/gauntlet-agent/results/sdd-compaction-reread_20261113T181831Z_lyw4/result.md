# Test Result: sdd-compaction-reread

**Status:** investigate
**Duration:** 1670.2s

## Summary

The subagent-driven-development loop kept working through 14 auto-compactions: all four tasks were implemented, each was reviewed before the next started, and a final whole-branch review approved the branch. The agent then loaded the finishing-a-development-branch skill. It never offered the merge/push/keep/discard choice, because Claude Code stopped the turn with "Autocompact is thrashing" while the agent was re-reading skill files after a compaction.

## Reasoning

Criteria 1–3 are clearly met, based on git, npm test and the session log. Criterion 4 is only partly met. The session did end inside the finishing skill, but the skill never got to its options: Claude Code's thrash guard stopped the turn. After each compaction the agent re-read the same set of skill files (task-reviewer-prompt.md is 257 lines, review-and-complete.md 171, implementer-prompt.md 173, plus plan.md). In the finishing step that seems to refill the context right away. I didn't send anything after the stop, so I wouldn't be steering the session. An engineer should decide whether this counts as "reaching the finishing step" and look at whether the re-read-everything-after-compaction behaviour causes the thrash.

## Observations (5)

- **[bug]** In the finishing step, Claude Code stopped the session with 'Autocompact is thrashing…3 times in a row'. After every compaction the controller re-reads several large skill files plus plan.md, which seems to refill the small context window right away. The finishing options (merge/push/keep/discard) were never offered.
- **[performance]** The 26-minute session had 14 compact_boundary events, about one every 1–2 minutes from 18:23 to 18:41. Each one was followed by the same block of skill-file re-reads, so the screen showed the same 'Read …task-reviewer-prompt.md (257 lines)' and similar lines many times.
- **[ux]** During the pre-flight scan the agent asked two plan-consistency questions: the PASSAGE constants are unused, and the RangeError paths have no tests. Both were reasonable, and I answered 'Proceed as you recommend.' The agent took the recommended options; the test count ended at 38.
- **[ux]** On first launch Claude Code showed a 'Newer Opus model available — Currently pinned: Opus 5' prompt, even though the launcher passes --model claude-opus-5-5. I chose No. The banner then showed Opus 5.5 · Google Vertex AI.
- **[ux]** A hyperpowers/state branch appeared alongside feature/textstats; it is presumably the skill's ledger. The agent also said 'Codex is not installed, so the per-task check records a degraded entry'.
