# Test Result: sdd-compaction-reread

**Status:** pass
**Duration:** 1513.2s

## Summary

The controller ran all four tasks through the subagent-driven-development (SDD) loop, one at a time: implement, then review, for each task. After that it ran a final review of the whole branch, a fix pass, and a re-review, then reached the finishing step. Context was compacted 9 times during the run, and the loop held its order through every one. All 39 tests pass and the work is committed on feature/textstats. One surprise at the end: after I chose "Keep the branch as-is", the agent left the checkout detached from the branch.

## Reasoning

Every criterion is backed by what's on disk (exports, test files, commits, npm test with 39/39 passing) and by the order of Agent and Skill calls in the session log. Through 9 compactions, each implement step was followed by its review before the next task began. The final whole-branch review ran, and the session ended in finishing-a-development-branch. The detached HEAD is worth a look but doesn't break any criterion.

## Observations (6)

- **[ux]** When I chose 'Keep the branch as-is', the agent also detached HEAD. git status shows 'HEAD detached at e26fbb1', and the agent said 'I detached the checkout from the branch... Run git switch feature/textstats to go back.' A user who asks to keep the branch as-is would not expect their checkout to move off the branch.
- **[ux]** Before Task 1 started, the agent asked a two-part question about gaps in the plan: an unused PASSAGE fixture, and validation behaviour with no tests. Each part had a '(Recommended)' option. I answered 'Proceed as you recommend.' in the free-text field, and it added the extra tests (39 tests instead of the plan's 32). That's reasonable, but it is an extra stop before any work begins.
- **[suggestion]** Compaction happened 9 times (log lines 150, 268, 372, 482, 585, 683, 785, 910, 968), roughly once per step. After compaction, Claude Code restored task-loop.md, review-and-complete.md, task-reviewer-prompt.md and re-review-prompt.md from ~/.cache/hyperpowers/compaction-reread-notice/arms/controller/..., and the screen showed 'Skills restored (...)'. The loop survived every compaction.
- **[ux]** The agent noted that 'Codex isn't installed, so the extra Codex review on each task and on the whole branch was skipped.' It disclosed this openly, but it means one layer of review never ran.
- **[ux]** Claude Code's start-up prompts have the cautious answer selected by default: the folder-trust prompt and the bypass-permissions prompt both default to 'No, exit'. A 'Newer Opus model available' prompt also appeared even though the launcher passed --model claude-opus-5-5 (it said 'Currently pinned: Opus 5'). I chose No, and the banner then showed 'Opus 5.5'. The prompt contradicts the launch flag, which is confusing.
- **[bug]** In its final summary the agent flagged a possible spec issue: sentenceCount('I live on Main St. It is nice.') returns 1, because plan.md:199 treats 'St.' as an abbreviation. It also said the plan's Completion section still says 32 tests when there are 39. Both come from the fixture plan, not the controller.
