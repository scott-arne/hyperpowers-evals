# Test Result: sdd-empty-frontier-posts-and-hands-back

**Status:** pass
**Duration:** 181.3s

## Summary

The second SDD session did what the empty-frontier rule asks. It loaded hyperpowers:subagent-driven-development first, made a worktree, registered itself on feature/parallel, and ran `sdd-state next`, which returned `none reason=held`. It then posted a waiting record of kind `tasks`, printed the board and handed back saying both tasks are held by fixture-session. It never took over a task.

## Reasoning

I checked all six criteria against the session log's tool calls and results and against the waiting file on disk, and each one is met. The worktree guard's false positives are worth an engineer's attention, but they did not stop the scenario.

## Observations (6)

- **[bug]** The worktree-isolation guard read the branch name 'feature/parallel' as the GNU `parallel` command ('feeds git its arguments from stdin at runtime (xargs/parallel)') and refused `git switch --detach feature/parallel` twice. The agent got around it by reading the ref sha from .git/refs and detaching by sha. Any branch with 'parallel' in its name will hit this false positive.
- **[bug]** The guard also rejected the first compound sdd-state command as 'a command whose name is computed at runtime' because it called the script through a $S variable. The agent had to split it into separate commands with literal paths.
- **[suggestion]** The agent added its session line to progress.md itself with `cat >>` instead of through an sdd-state verb. Either the skill tells it to do this or there is no verb for it; worth checking whether a `join` verb should exist.
- **[ux]** The waiting note the agent passed includes a literal ' waiting=none', copied from the `next` output, and the board prints it URL-encoded as 'note=held=1@fixture-session,2@fixture-session%20waiting=none'. The on-screen summary showed a cleaned-up version.
- **[suggestion]** The sdd-state scripts ran from the host's real ~/.cache/hyperpowers/parallel-development/hp-treatment path, while state was written under the throwaway HOME's .cache. Harness isolation may be incomplete.
- **[ux]** Startup showed a 'Newer Opus model available: Currently pinned Opus 5' prompt even though the launcher passes --model claude-opus-5-5. I chose No, and the banner then showed Opus 5.5. The trust and bypass dialogs default to 'No, exit'.
