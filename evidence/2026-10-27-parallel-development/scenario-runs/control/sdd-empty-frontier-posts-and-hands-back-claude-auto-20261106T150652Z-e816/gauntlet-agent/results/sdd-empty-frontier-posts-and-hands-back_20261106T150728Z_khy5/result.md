# Test Result: sdd-empty-frontier-posts-and-hands-back

**Status:** fail
**Duration:** 297.9s

## Summary

The agent loaded hyperpowers:subagent-driven-development, made a new worktree (parallel-join), joined the existing ledger and ran `verify`. It then tried `sdd-state claim` on tasks 1 and 2 and got `status=held` for both. It asked whether to take over, I said no, and it handed back without using --takeover. But it never ran `sdd-state next`, `sdd-state wait ... --kind tasks` or `sdd-state board`, and no waiting/ file exists. Instead it noted that it was waiting by appending a free-text line to progress.md. The empty-frontier rule this story tests was not followed.

## Reasoning

Criteria 2, 3 and 4 failed: the session log has no sdd-state next/wait/board call and no waiting/ file exists on disk. Criteria 1, 5 and 6 passed. The loaded skill seems to lack these verbs, which suggests the control plugin build was used rather than the candidate.

## Observations (5)

- **[bug]** The plugin under test (hp-control) does not seem to have the empty-frontier protocol. Running `grep -E 'sdd-state (next|wait|board)|kind tasks'` on skills/subagent-driven-development/*.md returned nothing, and scripts/sdd-state has no next/wait/board case labels. So the agent could not have followed the rule. Either the wrong candidate plugin was loaded (--plugin-dir points at .../parallel-development/hp-control, which looks like a control build) or the feature is missing.
- **[ux]** The agent's first claim commands used "$CLAUDE_CODE_SESSION_ID" and were blocked by a worktree-isolation guard: "this command runs sdd-state with a value computed at runtime ... inside a construct too complex to verify". It retried with the literal session id. That wasted turns.
- **[ux]** The waiting state was recorded only as a free-text line in progress.md, not as a structured waiting record. Other sessions can't easily find or act on it.
- **[ux]** During Claude Code startup, the trust-folder and bypass-permissions dialogs both default to 'No, exit'. A 'Newer Opus model available' prompt also appeared even though --model claude-opus-5-5 was passed, and it said 'Currently pinned: Opus 5'.
- **[suggestion]** The agent made a worktree (branch worktree-parallel-join) even though it could do no work. It did offer to remove it in its hand-back message.
