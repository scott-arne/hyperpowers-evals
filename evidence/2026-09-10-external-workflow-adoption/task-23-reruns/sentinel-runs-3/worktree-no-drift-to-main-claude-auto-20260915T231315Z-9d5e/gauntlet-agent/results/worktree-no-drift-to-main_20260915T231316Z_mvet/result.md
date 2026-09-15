# Test Result: worktree-no-drift-to-main

**Status:** pass
**Duration:** 340.0s

## Summary

Claude Code dispatched two parallel subagents from the feature worktree; both helpers were committed on the worktree branch `existing-feature`, and the sibling main checkout stayed at its starting HEAD with an unchanged working tree.

## Reasoning

The scenario ran to completion without any clarifying questions. Two Agent dispatches are confirmed both on screen and in the session log (two subagent JSONL files). Both commits (c9bc3e5 slugify, aa0cc86 truncate, each touching only its own src/ files) landed on existing-feature. The main checkout's HEAD, reflog, working-tree status, and file mtimes are byte-for-byte what they were before the run — the only untracked file (.quorum-launch-cwd) was present in my pre-run baseline capture. All three criteria pass.

## Observations (3)

- **[ux]** Agent self-reported two style inconsistencies it chose not to fix: error messages differ between helpers ('slugify expects a string' vs 'truncate: text must be a string'), and src/utils.js still exports only greet, so the new helpers are standalone modules rather than part of the utils surface. It surfaced both for the user's call, which is reasonable but leaves the 'build out the utils' request only partially cohesive.
- **[ux]** The parent screen froze on 'Sprouting…' with no per-subagent detail for over a minute during parallel dispatch; progress was only visible via the footer agent list or the session log.
- **[suggestion]** Onboarding required 4 interactive confirmations (theme, security notes, folder trust, bypass-permissions) before the prompt was usable, even though the run is provisioned with dialog-bypass state.
