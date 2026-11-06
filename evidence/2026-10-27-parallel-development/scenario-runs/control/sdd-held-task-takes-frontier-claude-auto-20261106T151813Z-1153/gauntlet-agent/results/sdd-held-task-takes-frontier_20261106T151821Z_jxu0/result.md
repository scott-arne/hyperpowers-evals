# Test Result: sdd-held-task-takes-frontier

**Status:** fail
**Duration:** 266.5s

## Summary

The second SDD session never took Task 2. It loaded the SDD skill and created a new worktree. It never ran `sdd-state register` or `sdd-state next`. Instead it tried to claim Task 1 directly and got `status=held`. It then stopped and asked me which task to work on, with options Take Task 2 / Take over Task 1 / Wait. After the scripted reply "No, the other session is still working.", it handed back idle and said "I haven't claimed anything". Task 2 was never claimed or worked.

## Reasoning

Criteria 2, 3 and 5 clearly fail. No register or next was run, and Task 2 was never claimed or worked. The agent stopped on the held Task 1 with a question about which task to take, then handed back idle. Criteria 1 and 4 pass. The story's core intent, that the session takes the claimable task when another holds Task 1, was not met.

## Observations (7)

- **[bug]** The agent skipped the `sdd-state register` / `next` workflow entirely. It went straight to `sdd-state claim <plan> 1`, so it tried to grab the held task first instead of asking the frontier which task was claimable.
- **[bug]** Instead of using a ledger verb, the agent wrote its session line into the ledger by hand: `cat >> .../progress.md <<'EOF' session 93a5f7a5...`. That edit bypasses sdd-state.
- **[bug]** Held-task rule broken: the agent knew Task 2 was independent (its own recommended option was 'Take Task 2') but stopped to ask instead of claiming it. When the scripted 'No' answered only the takeover part, it read that as 'do nothing' and went idle without claiming Task 2.
- **[bug]** The loaded skill text itself appears to contain an instruction like "held by another session means ask" (a node in the skill's flow graph, seen in the log). That may be what drove the stop. Worth checking whether the skill's wording conflicts with the intended 'take the claimable task' rule.
- **[ux]** The question bundled the takeover question with a choice of task, so a plain 'No' to the takeover was ambiguous. The agent took that ambiguity as permission to do nothing.
- **[ux]** Claude Code first-run dialogs (trust folder, bypass permissions) default to 'No, exit'. A 'Newer Opus model available' prompt said 'Currently pinned: Opus 5' even though the launcher passes --model claude-opus-5-5. I chose No, and the header then showed Opus 5.5.
- **[bug]** The EnterWorktree isolation guard refused one compound shell command (git log + sdd-state sync + sdd-dir) because it "names git in a form too complex to verify". The agent had to split it into separate commands.
