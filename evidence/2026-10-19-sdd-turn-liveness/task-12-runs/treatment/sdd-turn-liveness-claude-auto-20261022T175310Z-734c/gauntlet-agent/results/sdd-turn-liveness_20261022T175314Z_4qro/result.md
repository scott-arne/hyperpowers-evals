# Test Result: sdd-turn-liveness

**Status:** pass
**Duration:** 2275.1s

## Summary

I sent the scripted prompt, and the agent loaded hyperpowers:subagent-driven-development, then set up an isolated worktree. It asked one question, about the workspace, before any task started. After that it ran all six tasks, each with an implementer and a reviewer, without stopping. It kept its turn alive through both soak tests: it ran the 4-minute soak in the foreground and polled the 12-minute soak in a foreground loop. Then it dispatched the final whole-branch review and asked how to finish. I said "merge back to main locally", and it fast-forwarded main to e5cd151. The soak test files are unchanged. I never had to send "continue".

## Reasoning

All four criteria are backed by the session log, git state and file hashes. The agent never stalled mid-plan. Its only mid-plan stop was a real workspace question at setup, which I answered with the scripted reply. Both soak runs were kept inside the turn: one foreground and one with a foreground polling loop. The final review ran, and main was fast-forwarded with the soak files unchanged.

## Observations (8)

- **[ux]** During first-run onboarding, the workspace-trust and bypass-permissions dialogs both had 'No, exit' selected by default. I had to press Down to accept each one.
- **[bug]** At startup a 'Newer Opus model available' prompt said 'Currently pinned: Opus 5', even though the launcher passes --model claude-opus-5-5. I chose No, and the header still showed 'Opus 5.5'. The message contradicts the flag.
- **[bug]** The Haiku implementer subagents signed their commits 'Co-Authored-By: Claude Haiku 4.5'. The agent then rewrote the messages on the branch with git filter-branch before the final review, which changed the commit IDs (it said the code was identical, empty diff). Rewriting history mid-workflow is surprising.
- **[ux]** The agent noted that 'The shell guard trips on the word ".gitignore"' and switched to the file tools to update its ledger.
- **[suggestion]** The Codex review gate was skipped because Codex is 'not-installed'. The skip was recorded in an ungated-review ledger and mentioned in the summary.
- **[ux]** After the merge, the agent did not remove the worktree at .claude/worktrees/feat-ratelimit or delete the branch worktree-feat-ratelimit. It said the removal rules told it to leave that workspace alone. As a result, `git status` on main shows untracked .claude/, ratelimit/__pycache__/ and tests/__pycache__/ (there is no .gitignore).
- **[suggestion]** The agent pointed out a possible off-by-one in the simulator from accumulated floating-point error (for example, --limit 2 --window 0.3 --calls 30 gives 19 where exact arithmetic gives 20). It left the fix to the user because it would change the plan.
- **[performance]** The whole plan took about 33 minutes ('Brewed for 32m 56s'). Most of that was the two soak tests: the short soak ran once inside the Task 3 implementer and once more as the controller's re-verification, so it ran twice.
