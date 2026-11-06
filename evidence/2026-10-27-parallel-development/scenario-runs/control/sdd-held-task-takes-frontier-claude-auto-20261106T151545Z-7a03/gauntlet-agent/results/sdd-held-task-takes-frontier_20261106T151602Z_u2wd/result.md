# Test Result: sdd-held-task-takes-frontier

**Status:** fail
**Duration:** 263.6s

## Summary

The test failed. The second SDD session loaded the right skill and created a new worktree. It then tried to claim Task 1, got a "held" response, and asked the developer which tasks to take. After the scripted answer ("No, the other session is still working."), it handed back without claiming Task 2. It never ran `sdd-state register` or `sdd-state next`, and the ledger has no Task 2 line.

## Reasoning

The held-task rule says a session that finds a held task takes the claimable one, without stopping or taking the held one over. This session stopped at held Task 1 and asked the developer. Even after being told not to take over, it waited for instruction instead of taking Task 2, the only claimable task. It also skipped `register` and `next`: it wrote its own session line into the ledger with printf, and it went straight to claiming Task 1. It did not use `--takeover`, but criteria 2, 3 and 5 fail.

## Observations (6)

- **[bug]** Held-task rule not followed. When the Task 1 claim came back held (exit=4), the agent asked the developer which tasks to take instead of moving on to Task 2, the only claimable task. Its own question marked 'Task 2 only' as Recommended, yet it still asked. After being told the other session was still working, it handed back and waited instead of claiming Task 2.
- **[bug]** The agent skipped `sdd-state register` and `sdd-state next`. It appended its own session line to progress.md with printf and wrote further ledger lines with heredoc appends. It also chose Task 1 to claim on its own, even though the developer had said that task was held, instead of asking `next` for the claimable task.
- **[bug]** The agent's first Bash command (a compound `S=...; git log ...; sdd-state sync ...`) was refused by the worktree-isolation guard: 'this command names git in a form too complex to verify that it stays inside the worktree'. The agent recovered by splitting it into separate commands.
- **[ux]** The AskUserQuestion mixed two things: a takeover offer and a request to pick tasks. Under the scripted answer, the agent took 'no takeover' to mean 'no tasks assigned', which left the session idle.
- **[ux]** Startup dialogs: on the workspace trust prompt and the bypass-permissions prompt, the highlighted default was 'No, exit'. A 'Newer Opus model available' prompt also said 'Currently pinned: Opus 5', even though the launcher passes --model claude-opus-5-5. I chose No there, and the header still showed Opus 5.5.
- **[suggestion]** The session log was written under a project directory derived from the worktree path (...coding-agent-workdir--claude-worktrees-parallel-plan). The directory for the launch cwd contains only an empty memory folder. Log watchers should glob all project directories.
