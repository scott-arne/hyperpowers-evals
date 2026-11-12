# Test Result: sdd-compaction-reread

**Status:** fail
**Duration:** 348.5s

## Summary

The controller never started Task 1. Auto-compaction hit during SDD setup, before any task. After each compaction the controller re-read the full SDD SKILL.md (plus the ledger and git log), which filled the context back up. After 3 compactions in a row, Claude Code stopped the turn with "Autocompact is thrashing". No subagents were dispatched, no code was written, there were no reviews, and the session never reached the finishing step.

## Reasoning

None of the acceptance criteria are met. On disk nothing changed: src/textstats.js is still `module.exports = {};`, test/ is empty and there are no new commits. The session log shows only setup and repeated re-reads of SKILL.md, no subagent dispatches, and 3 back-to-back auto-compactions that ended in Claude Code's 'Autocompact is thrashing' stop. The agent asked no questions I could answer, and the story says not to steer it, so the run was over at that point.

## Observations (6)

- **[bug]** Compaction loop that stopped the run: the log has 3 auto compact_boundary events (preTokens 69249→postTokens 15286, then 66847→14977, then 66296→14995). After each one the controller said "Re-reading the SDD skill in full, plus the ledger and git log, before going further" and issued several Read calls on SKILL.md (some full, some with an offset) plus cat calls on ledger/plan files. That refilled the context to the threshold right away, and Claude Code stopped the turn. Re-reading after compaction undoes the compaction when the skill and plan are this large (plan.md is 27.6KB; autoCompactWindow is 100000).
- **[bug]** Compaction hit before Task 1 started, during setup (worktree decision, ledger creation, pre-flight conflict scan), not after the first task as the scenario intended. The setup phase alone (skill load + plan + ledger + scan) uses most of a 100k window.
- **[ux]** After thrashing stopped the turn, the agent left no message for the user saying the plan wasn't executed or what to do next. The only explanation is Claude Code's generic yellow warning, and the prompt just sits idle.
- **[ux]** The setup did write some state: a `hyperpowers/state` branch exists (`git branch` shows `+ hyperpowers/state`). It's left behind even though no work happened.
- **[ux]** Startup showed onboarding dialogs (theme, security notes, folder trust, bypass-permissions warning) and a 'Newer Opus model available — Currently pinned: Opus 5, Latest: Opus 5.5' prompt, even though the launcher passes --model claude-opus-5-5. I chose 'No' so it wouldn't restart; the header then showed 'Opus 5.5 · Google Vertex AI'. The 'pinned Opus 5' message contradicts the --model flag.
- **[suggestion]** After a compaction, the controller could re-read only the parts of the skill it needs (or a short summary/checklist) instead of the full SKILL.md, so the re-read doesn't push context straight back over the threshold.
