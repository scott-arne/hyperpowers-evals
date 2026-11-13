# Test Result: sdd-compaction-reread

**Status:** investigate
**Duration:** 2177.2s

## Summary

The task loop held up well through repeated compactions. All four tasks were implemented, committed and reviewed one at a time, a final whole-branch review ran, and npm test passes (77/77). The finishing-a-development-branch skill loaded, but Claude Code then stopped with "Autocompact is thrashing". The finishing options (merge, push, keep, discard) were never shown, so it is unclear whether the session "ended in the finishing step".

## Reasoning

Criteria 1–3 are clearly met, based on git, the npm test output and the Agent dispatch order in the session log. For criterion 4, the agent did enter the finishing skill, but Claude Code stopped it with an autocompact-thrashing error before it presented or carried out any finishing choice. Whether that counts as "ending in the finishing step" is unclear, and the thrashing itself looks like a real problem with how often the controller re-reads files after each compaction. So my verdict is investigate rather than pass.

## Observations (5)

- **[bug]** The run ended on Claude Code's 'Autocompact is thrashing' halt during the finishing step, so the user never got the finishing choices. Over about 13 minutes (18:40–18:53) the log shows more than 12 compact_boundary events. After each compaction the controller re-read several skill files (SKILL.md, task-loop.md, task-reviewer-prompt.md, review-and-complete.md, finishing SKILL.md, communication SKILL.md) and the 27.6KB plan.md, which seems to refill the small context window almost straight away. Within its last few turns the controller read finishing-a-development-branch/SKILL.md and communication/SKILL.md twice each. The re-read behavior may be too heavy for a small compaction window.
- **[ux]** Startup showed a 'Newer Opus model available — Currently pinned: Opus 5' dialog, even though the launcher passes --model claude-opus-5-5. I chose 'No'. The banner then showed 'Opus 5.5 · Google Vertex AI'.
- **[ux]** The pre-flight scan stopped to ask a long multiple-choice question about test gaps in the plan (unused PASSAGE constants; tests fixed at 8 per file). I answered 'Proceed as you recommend.', and the implementers added extra tests, so the suite has 77 tests instead of the plan's 32.
- **[suggestion]** The final Codex gate was recorded as 'degraded' because Codex is not installed. This is worth flagging if reviewers expect that gate to run.
- **[ux]** Startup needed four manual dialogs (theme, security notes, folder trust, bypass-permissions warning) before the prompt appeared, even though the HOWTO says dialog-bypass state is seeded.
