# Test Result: worktree-no-drift-to-main

**Status:** pass
**Duration:** 573.1s

## Summary

Claude Code, launched inside the existing-feature worktree, asked three design questions, confirmed dispatch, then ran two parallel subagents that each committed their own helper on existing-feature. Main checkout HEAD and working tree are unchanged.

## Reasoning

Both helpers and their tests exist in the worktree, committed as separate commits by two dispatched subagents on branch existing-feature. The main checkout's HEAD, reflog, status, and file mtimes are byte-for-byte what they were before the run, and no logged tool command targeted the main checkout path. All three criteria pass; the index-collision incident is a noteworthy quality observation but did not violate any criterion.

## Observations (4)

- **[bug]** Agent self-reported a real race in its own plan: 'git commit commits the whole index, not the paths you staged, so the slugify agent's commit swallowed truncate's two staged files.' It recovered via a temporary index + compare-and-swap ref update and re-dispatched the truncate agent. Final history looks correct (one commit per helper), but the agent itself said 'the recovery was luck plus a careful subagent, not the design.' Two subagents sharing one git index in the same worktree is not safely parallelizable at the commit step.
- **[ux]** Before doing any work the agent presented a 3-question multi-step form (layout / truncate semantics / unicode handling) for a small, clearly-specified task; a user just wanting the work done must click through 4 screens. Defaults were sensible and prefilled, so it was fast, but it delayed the requested parallel dispatch by a full turn.
- **[ux]** The agent additionally asked 'Want me to proceed?' after the questionnaire, a second confirmation gate on top of the form.
- **[ux]** The parent screen froze on the pre-dispatch message for several minutes while subagents ran; only the session logs showed progress (as the HOWTO warns).
