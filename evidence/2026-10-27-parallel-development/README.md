# Parallel development: live two-session run (2026-10-27 plan, Task 13)

Two real Claude Code sessions ran `hyperpowers:subagent-driven-development` on a three-task throwaway plan against the parallel-development branch. The second session registered against the first session's integration branch, took Task 2 while the first took Task 1, merged it into `worktree-live`, took Task 3, claimed the final train and finished the workspace. The first session handed back at `status=none reason=held` before the final claim, which differs from the brief's expected outcome only in when it stopped. Neither of the spec's two Assumptions failed.

All paths below are under `task-13-runs/`.

## Candidate

- Path: `/Users/johnss51/Development/agents/hyperpowers/.worktrees/parallel-development` (`candidate-path.txt`)
- Commit: `d53ddf5cf630a055e0aff6e37009f17c526aaf7f` (`candidate-commit.txt`)

The first `sdd-dir` call in each condensed log runs under the candidate, not under `.worktrees/plugin-install`.

`s1-tools.txt` line 79:

```
>>> Bash: bash /Users/johnss51/Development/agents/hyperpowers/.worktrees/parallel-development/skills/subagent-driven-development/scripts/sdd-dir docs/hyperpowers/plans/2026-10-27-live.md; echo "exit=$?"
```

`s2-tools.txt` line 105:

```
>>> Bash: /Users/johnss51/Development/agents/hyperpowers/.worktrees/parallel-development/skills/subagent-driven-development/scripts/sdd-dir docs/hyperpowers/plans/2026-10-27-live.md; echo "exit=$?"
```

## Method and departures from the brief

`scripts/parallel-live-step1.sh` builds the throwaway repository and the two configuration directories (the brief's Step 1 commands with the candidate path fixed). `scripts/parallel-live-run.sh` runs Step 2. `scripts/condense.py` turns each session's stream-json capture into the condensed logs (`>>>` is a tool call, `<<<` its result cut at 1500 characters, `###` the session's own text). In the copy of `parallel-live-run.sh` kept here, the number after `--max-budget-usd` is replaced with `<cap>`; the original carries a per-session budget cap. The condensed logs cut each assistant text turn at 800 characters, so the two sessions' final messages are kept whole in `task-13-runs/s1-final-message.txt` and `task-13-runs/s2-final-message.txt`.

Departures from the brief:

- The sessions were two print-mode `claude -p` runs (`--output-format stream-json --verbose --dangerously-skip-permissions` and a per-session budget cap) driven by the orchestrator script, not two interactive terminals. The orchestrator started session 2 when session 1's ledger showed `Task 1: branch`, and ran `sdd-state board` itself at the three moments.
- The orchestrator ran outside the controller's own Bash sandbox, because a session's sandbox cannot start inside an outer one (`sandbox-exec: sandbox_apply: Operation not permitted`, exit 71). Each session's own sandbox then ran as configured.
- The configuration directories are copies of the host's `~/.claude/settings.json`, so the sessions carried the host's hooks and sandbox settings, its env block and model pins, and no installed plugins.
- The CLAUDECODE and CLAUDE_CODE_* session variables of the controller were stripped from the sessions' environment.
- The raw stream-json captures and the session transcripts under the configuration directories are not committed. They carry cost fields and the host's environment values.

`events.txt` is the orchestrator's timeline (UTC). Session 1 started at 13:48:48Z, session 2 at 13:50:45Z, and both had ended by 14:09:26Z with exit 0.

## What each session did

The brief expected: terminal 2's Setup registers, starts detached, `next` offers Task 2, both sessions run their tasks; the first to finish merges back, the second's merge-back makes a merge commit; Task 3 is claimed by whichever session's `next` sees both complete; that session also claims `final` and the other hands back with the board.

Session 1 is `964f53cc-6623-475d-a7d2-3af4e92f3563`, session 2 is `8082acd7-244b-4398-884d-0a590e7878ed`.

Session 1 (`s1-tools.txt`):

```
114:<<< status=registered integration=worktree-live plan-ref=worktree-live
198:<<< status=next tasks=1,2 own-blocked=none plan=de1e19e
201:<<< status=claimed task=1 branch=worktree-live.cc79c6c2.task-1 from=bb2948d
807:<<< status=merged task=1 head=a7a307f
823:<<< status=none reason=held held=2@8082acd7-244b-4398-884d-0a590e7878ed waiting=3
827:<<< status=waiting kind=tasks
830:<<< status=board sync=no-remote sessions=2 waiting=1 frontier=none
```

Session 1 registered the integration branch, saw both tasks offered, claimed Task 1, and merged it as a fast-forward. It then detached at `a7a307f`, dropped the task branch, wrote the completion line and snapshotted. Its next `next` found Task 2 held by session 2 and Task 3 waiting, so it posted a waiting record, printed the board and handed back, as the candidate's SKILL.md instructs for `reason=held`. Its final message (`s1-tools.txt` line 837, whole in `s1-final-message.txt`) asked to be told to continue once Task 2 had merged. That is the departure from the expected outcome: session 1 handed back at `held`, not in response to the final claim. In two interactive terminals a human would have resumed it later; in print mode it ended. The brief's last clause, that the other session hands back with the board, holds at an earlier point.

Session 2 (`s2-tools.txt`):

```
158:<<< status=registered integration=worktree-live plan-ref=worktree-live
180:<<< status=next tasks=2 own-blocked=none plan=de1e19e
183:<<< status=claimed task=2 branch=worktree-live.cc79c6c2.task-2 from=bb2948d
1025:<<< status=merged task=2 head=f913fe5
1050:<<< status=next tasks=3 own-blocked=none plan=de1e19e
1054:<<< status=claimed task=3 branch=worktree-live.cc79c6c2.task-3 from=f913fe5
1454:<<< status=merged task=3 head=29ddd08
1470:<<< status=none reason=complete
1474:<<< status=claimed task=final lease=d9a404eb59e5b6d11c8a43ebfca4d2413702527f.final-0864a5108e5a
2072:<<< status=finished sha=9127c3d last=e7e0f122d21c4942b0541a0f7054f698f4e9f302 push=origin/hyperpowers/state
```

Session 2 detached at `worktree-live` before `register`, was offered only Task 2, claimed it, and its merge-back produced the merge commit `f913fe5` (`Merge task 2: b.sh`) because session 1 had already advanced the integration branch. It then detached at `f913fe5`, was offered Task 3 with `from=f913fe5`, and merged it as `29ddd08`. With all three tasks complete, `next` printed `reason=complete` and session 2 claimed `task=final`. It then switched its worktree to `worktree-live`, ran the three tests (each printed `PASS`), ran a final review (opus), and ran `sdd-state finish`. The reviewer's own hand-back, as text only, is `task-13-runs/s2-final-review-handback.txt`; it lists no Critical and no Important issues and answers "Ready to merge? Yes". The session's ledger records the extractor dispatch (`ledger-before-finish.md` line 59) and round 1 of the final Codex gate approved by three lenses (line 61); those two results are the session's own record, not something this note observed independently. The finishing skill compiled one decision record, ran the suite and stopped at the three-option merge menu with the staged records awaiting approval (the menu is in `s2-final-message.txt`; the condensed `s2-tools.txt` cuts that message before it).

## Board outputs

Board 1, captured at 13:52:12Z when both tasks were claimed (`board-1.txt`):

```
status=board sync=no-remote sessions=2 waiting=0 frontier=none
session 8082acd7-244b-4398-884d-0a590e7878ed task=2 since=2026-11-06T13:52:09Z worktree=/Users/johnss51/.cache/hyperpowers/parallel-live/repo/.claude/worktrees/live-8082acd7 branch=detached host=C3FD9L14WW waiting=none waiting-since=none note=none silence=2 quiet-since=none
session 964f53cc-6623-475d-a7d2-3af4e92f3563 task=1 since=2026-11-06T13:50:41Z worktree=/Users/johnss51/.cache/hyperpowers/parallel-live/repo/.claude/worktrees/live branch=worktree-live.cc79c6c2.task-1 host=C3FD9L14WW waiting=none waiting-since=none note=none silence=89 quiet-since=none
held task=1 owner=964f53cc-6623-475d-a7d2-3af4e92f3563 since=2026-11-06T13:50:41Z
held task=2 owner=8082acd7-244b-4398-884d-0a590e7878ed since=2026-11-06T13:52:09Z
```

Board 2, captured at 13:55:41Z when the orchestrator saw the first `merged` line in the ledger (`board-2.txt`). Both claims still show as held and session 1 is still on its task branch, so the capture appears to have preceded the merge-back's release of Task 1 (a reading of the `held task=1` line and session 1's task branch, not something the board states):

```
status=board sync=no-remote sessions=2 waiting=0 frontier=none
session 8082acd7-244b-4398-884d-0a590e7878ed task=2 since=2026-11-06T13:52:09Z worktree=/Users/johnss51/.cache/hyperpowers/parallel-live/repo/.claude/worktrees/live-8082acd7 branch=worktree-live.cc79c6c2.task-2 host=C3FD9L14WW waiting=none waiting-since=none note=none silence=211 quiet-since=none
session 964f53cc-6623-475d-a7d2-3af4e92f3563 task=1 since=2026-11-06T13:50:41Z worktree=/Users/johnss51/.cache/hyperpowers/parallel-live/repo/.claude/worktrees/live branch=worktree-live.cc79c6c2.task-1 host=C3FD9L14WW waiting=none waiting-since=none note=none silence=3 quiet-since=none
held task=1 owner=964f53cc-6623-475d-a7d2-3af4e92f3563 since=2026-11-06T13:50:41Z
held task=2 owner=8082acd7-244b-4398-884d-0a590e7878ed since=2026-11-06T13:52:09Z
```

Board 3, captured at 14:02:36Z when the final claim existed (`board-3.txt`). It prints no `held` lines because Tasks 1 to 3 are complete:

```
status=board sync=no-remote sessions=2 waiting=1 frontier=none
session 8082acd7-244b-4398-884d-0a590e7878ed task=final since=2026-11-06T14:02:32Z worktree=/Users/johnss51/.cache/hyperpowers/parallel-live/repo/.claude/worktrees/live-8082acd7 branch=detached host=C3FD9L14WW waiting=none waiting-since=none note=none silence=4 quiet-since=none
session 964f53cc-6623-475d-a7d2-3af4e92f3563 task=none since=none worktree=/Users/johnss51/.cache/hyperpowers/parallel-live/repo/.claude/worktrees/live branch=detached host=C3FD9L14WW waiting=tasks waiting-since=2026-11-06T13:56:02Z note=held=2@8082acd7-244b-4398-884d-0a590e7878ed%20waiting=3 silence=394 quiet-since=none
```

## Ledger before finish

`finish` removes the plan's workspace from the state tip, so the ledger is read from the commit before the one that removed it. The first command prints the removing commit, the second prints the ledger at its parent (`ledger-before-finish.md`, 61 lines, identical to the newest copy in `ledger-timeline/`):

```
git -C /Users/johnss51/.cache/hyperpowers/state/d9a404eb59e5b6d11c8a43ebfca4d2413702527f log -1 --format=%H hyperpowers/state -- plans/2026-10-27-live-cc79c6c2
git -C /Users/johnss51/.cache/hyperpowers/state/d9a404eb59e5b6d11c8a43ebfca4d2413702527f show 9127c3d^:plans/2026-10-27-live-cc79c6c2/progress.md
```

The first printed `9127c3d0bced527673cfe4bf3effc8abd5fa8ad8`.

`ledger-timeline/` holds the ledger as the orchestrator copied it each time it changed.

```
# SDD ledger — plan: docs/hyperpowers/plans/2026-10-27-live.md
session 964f53cc-6623-475d-a7d2-3af4e92f3563: mode worktree on worktree-live integrating worktree-live at /Users/johnss51/.cache/hyperpowers/parallel-live/repo/.claude/worktrees/live started 2026-11-06T13:49:28Z
plan: integration worktree-live code-root abc8043 plan-ref worktree-live plan-root abc8043 spec docs/hyperpowers/specs/2026-10-27-live-design.md
Spec: docs/hyperpowers/specs/2026-10-27-live-design.md
Decisions listing:
  1. Two files are written by two sessions
Pre-flight scan (plan=de1e19e):
| Scope | Produces / consumes | Finding |
|---|---|---|
| Task 1 self | test-a.sh runs `bash src/a.sh` expecting `A`; a.sh echoes `A`; creates and commits exactly src/a.sh, tests/test-a.sh | consistent |
| Task 2 self | test-b.sh runs `bash src/b.sh` expecting `B`; b.sh echoes `B`; creates and commits exactly src/b.sh, tests/test-b.sh | consistent (no shebang, unlike Task 1; both invoked via `bash`, so not functional) |
| Task 3 self | test-ab.sh runs `bash src/ab.sh` expecting `AB`; ab.sh prints the outputs of a.sh and b.sh concatenated; creates and commits exactly src/ab.sh, tests/test-ab.sh | consistent (cwd-relative paths, run from repo root like Tasks 1-2) |
| Task 1 -> Task 3 | 1 produces src/a.sh printing `A`; 3 consumes it via `bash src/a.sh` | agrees; dependency declared |
| Task 2 -> Task 3 | 2 produces src/b.sh printing `B`; 3 consumes it via `bash src/b.sh` | agrees; dependency declared |
| Task 1 <-> Task 2 | no shared file or interface | none |
| Global constraints | CHANGELOG.md merge-expected; no task edits it | no conflict |
| Rubric | every test asserts output; no duplicated logic | no conflict |
deps --check: status=clean plan=de1e19e
deps:
task=1 depends=none
task=2 depends=none
task=3 depends=1,2
Task 1: branch worktree-live.cc79c6c2.task-1 from bb2948d
session 964f53cc-6623-475d-a7d2-3af4e92f3563: mode worktree on worktree-live.cc79c6c2.task-1 integrating worktree-live at /Users/johnss51/.cache/hyperpowers/parallel-live/repo/.claude/worktrees/live started 2026-11-06T13:50:55Z
Task 1: base bb2948d
Task 1: implementer a860c8c915df287e3 (session 964f53cc-6623-475d-a7d2-3af4e92f3563, worktree /Users/johnss51/.cache/hyperpowers/parallel-live/repo/.claude/worktrees/live, branch worktree-live.cc79c6c2.task-1)
session 8082acd7-244b-4398-884d-0a590e7878ed: mode worktree on detached integrating worktree-live at /Users/johnss51/.cache/hyperpowers/parallel-live/repo/.claude/worktrees/live-8082acd7 started 2026-11-06T13:52:10Z
Task 2: branch worktree-live.cc79c6c2.task-2 from bb2948d
session 8082acd7-244b-4398-884d-0a590e7878ed: mode worktree on worktree-live.cc79c6c2.task-2 integrating worktree-live at /Users/johnss51/.cache/hyperpowers/parallel-live/repo/.claude/worktrees/live-8082acd7 started 2026-11-06T13:52:40Z
Task 2: base bb2948d
Task 1 gate dir: /Users/johnss51/.cache/hyperpowers/codex-review/d9a404eb59e5b6d11c8a43ebfca4d2413702527f/run-F9MT4sge
Task 2: implementer a865ad6134d900c37 (session 8082acd7-244b-4398-884d-0a590e7878ed, worktree /Users/johnss51/.cache/hyperpowers/parallel-live/repo/.claude/worktrees/live-8082acd7, branch worktree-live.cc79c6c2.task-2)
Task 2: task review approved (spec ✅, quality Approved, 0 findings; ⚠️ commit-body and TDD-evidence items checked by controller: no trailer, RED/GREEN present)
Task 2 gate dir: /Users/johnss51/.cache/hyperpowers/codex-review/d9a404eb59e5b6d11c8a43ebfca4d2413702527f/run-6tjyEqbc
Task 1: codex task gate round 1 approved (3 lenses, 0 findings)
Task 1: approved a7a307f
Task 1: merged a7a307f into worktree-live (from a7a307f)
Task 1: complete (commits bb2948d..a7a307f, review clean)
session 964f53cc-6623-475d-a7d2-3af4e92f3563: mode worktree on detached integrating worktree-live at /Users/johnss51/.cache/hyperpowers/parallel-live/repo/.claude/worktrees/live started 2026-11-06T13:55:48Z
Task 2: codex task gate round 1/5 approved (lenses correctness, contracts-and-integration, tests-and-evidence: approved, 0 findings; codex-plugin-cc 1.0.6, gpt-5.6-sol xhigh)
Task 2: approved 017bdfb
Task 2: merged f913fe5 into worktree-live (from 017bdfb)
Task 2: complete (commits bb2948d..017bdfb, review clean)
session 8082acd7-244b-4398-884d-0a590e7878ed: mode worktree on detached integrating worktree-live at /Users/johnss51/.cache/hyperpowers/parallel-live/repo/.claude/worktrees/live-8082acd7 started 2026-11-06T14:00:00Z
Task 3: branch worktree-live.cc79c6c2.task-3 from f913fe5
session 8082acd7-244b-4398-884d-0a590e7878ed: mode worktree on worktree-live.cc79c6c2.task-3 integrating worktree-live at /Users/johnss51/.cache/hyperpowers/parallel-live/repo/.claude/worktrees/live-8082acd7 started 2026-11-06T14:01:00Z
Task 3: base f913fe5
Task 3: implementer aab5fc02707e7cc1a (session 8082acd7-244b-4398-884d-0a590e7878ed, worktree /Users/johnss51/.cache/hyperpowers/parallel-live/repo/.claude/worktrees/live-8082acd7, branch worktree-live.cc79c6c2.task-3)
Task 3: task review approved (spec ✅, quality Approved; ⚠️ a.sh/b.sh outputs confirmed by controller runs of tests/test-a.sh and tests/test-b.sh: PASS)
Task 3: minor (deferred): src/ab.sh:1 and tests/test-ab.sh:1 use repo-root-relative paths, so they only work from the repo root (mandated by global constraints)
Task 3 gate dir: /Users/johnss51/.cache/hyperpowers/codex-review/d9a404eb59e5b6d11c8a43ebfca4d2413702527f/run-CI5VIjf9
Task 3: codex task gate round 1/5 approved (lenses correctness, contracts-and-integration, tests-and-evidence: approved, 0 findings; codex-plugin-cc 1.0.6, gpt-5.6-sol xhigh)
Task 3: approved 29ddd08
Task 3: merged 29ddd08 into worktree-live (from 29ddd08)
Task 3: complete (commits f913fe5..29ddd08, review clean)
session 8082acd7-244b-4398-884d-0a590e7878ed: mode worktree on detached integrating worktree-live at /Users/johnss51/.cache/hyperpowers/parallel-live/repo/.claude/worktrees/live-8082acd7 started 2026-11-06T14:03:00Z
Final: claimed by session 8082acd7-244b-4398-884d-0a590e7878ed (lease d9a404eb59e5b6d11c8a43ebfca4d2413702527f.final-0864a5108e5a)
session 8082acd7-244b-4398-884d-0a590e7878ed: mode worktree on worktree-live integrating worktree-live at /Users/johnss51/.cache/hyperpowers/parallel-live/repo/.claude/worktrees/live-8082acd7 started 2026-11-06T14:04:00Z
Decision extractor: a25eee754bc7ffce8 -> /Users/johnss51/.cache/hyperpowers/codex-review/d9a404eb59e5b6d11c8a43ebfca4d2413702527f/run-9eZ2ZXOT/decision-notes.md
Final review: clean (opus; Ready to merge: Yes; 0 Critical, 0 Important; Task 3 deferred minor triaged as no-fix, mandated by global constraints; no fix wave)
Final codex gate: round 1/3 approved (lenses correctness, integration-and-requirements-coverage, tests-and-evidence: approved, 0 findings; gate dir /Users/johnss51/.cache/hyperpowers/codex-review/d9a404eb59e5b6d11c8a43ebfca4d2413702527f/run-JnPHpSBZ)
```

## Integration branch

`git -C /Users/johnss51/.cache/hyperpowers/parallel-live/repo log --graph --oneline worktree-live`:

```
* 29ddd08 feat: ab
*   f913fe5 Merge task 2: b.sh
|\  
| * 017bdfb feat: b
* | a7a307f feat: a
|/  
* bb2948d spec and plan
* abc8043 init
```

`git-graph-all.txt`, `worktrees.txt` and `branches.txt` hold the repository's state after both sessions ended.

## Final suite

The finishing skill ran the three tests on the integration branch (`s2-tools.txt` lines 2096 to 2101). Each printed `PASS`:

```
>>> Bash: bash tests/test-a.sh
>>> Bash: bash tests/test-b.sh
<<< PASS
>>> Bash: bash tests/test-ab.sh
<<< PASS
<<< PASS
```

## Assumption 1: a worktree detached at the integration head between tasks

Holds. Every detach and switch succeeded on the first try: session 1 ran `git switch --detach a7a307f`; session 2 ran `git switch --detach worktree-live` at Setup, `git switch --detach f913fe5`, `git switch worktree-live.cc79c6c2.task-3`, `git switch --detach 29ddd08` and `git switch worktree-live` for the final train. Neither controller re-attached a branch on its own, asked about the detached HEAD or treated it as an error. Both wrote `mode worktree on detached` session lines and went on. The board shows `branch=detached` for an idle session (board 1 for session 2 after its claim and before it switched to the task branch, board 3 for session 1 waiting and session 2 holding final).

## Assumption 2: no subcommand holds one repository's lock when it needs the pair helper

Holds. The spec asked for a read of every `hp_lock` call site before Task 1. The audit ran during Task 2 of the plan, against the hyperpowers tree at `bec88b2`, and its rows are in `task-13-runs/hp-lock-audit.txt` (file and line numbers are at that commit). Every row shows the caller entering `hp_lock` holding no lock and not reaching the pair helper, and the last row is the verdict that no caller holds a lock when it would enter `hp_lock_pair`. The live run is the runtime check. Neither transcript contains a `lock held` line, and no `sdd-state` call returned `status=busy`. Both sessions wrote the same workspace concurrently (claims at 13:50:41Z and 13:52:09Z, snapshots from both) with no contention reported. Two sessions over one short run is a small sample, so this shows the common path does not deadlock, not that contention is absent.

## Observations

- Worktree name collision. Both sessions called the native `EnterWorktree` tool with the name `live`. For session 2 the tool resumed session 1's worktree (`s2-tools.txt` line 32: "A worktree with this name already existed and was resumed as-is"), and `git worktree list` there showed session 1's task-1 branch. Session 2 read the ledger, called `ExitWorktree` with `keep` (line 146) and created `live-8082acd7` (line 148). `using-git-worktrees` gives the later session a session-id name only on the `git worktree add` path (Step 1b). On the native path (Step 1a) it assumes a fresh worktree, and Setup runs before the ledger read, so a later session cannot know it is later when it names the worktree. Session 2 recovered on its own judgment. This is carried to the final whole-branch review as a follow-up.
- The native tool's branch `worktree-live-8082acd7` was left unused, as the candidate text says.
- Session 2 wrote round-minute times in its session lines (14:00:00Z, 14:01:00Z, 14:03:00Z, 14:04:00Z) instead of reading the clock. Session 1 used `date -u`.
- `finish` printed `push=origin/hyperpowers/state` in a repository with no remote, where `sync` had said `no-remote`. The line predates this branch: `task-13-runs/push-line-provenance.txt` shows it at the merge base `5abc925` (`sdd-state:758`) and at the candidate `d53ddf5` (`sdd-state:1512`), with the commands that printed them.
- Both sessions ran the Codex companion commands with the sandbox disabled after an EPERM writing under `~/.claude/plugins/data`.

## Task 14: the held-task scenarios

Both held-task scenarios separate the two arms completely. On this branch (treatment) 10 of 10 sessions passed each scenario, and on `main` before it (control) 0 of 10 did; the two-sided Fisher exact p-value is 0.000011 for each. All 40 attempt 2 rows ended with a verdict, so no replacement runs were needed. The control sessions had no `register`, `next`, `wait` or `board` to call, and only one control session claimed Task 2 (after an unscripted confirmation) and none posted a waiting record.

## What each scenario measures

Both measure the subagent-driven-development skill text for a second session that joins a plan another session is already running.

- `scenarios/sdd-held-task-takes-frontier/` (`story.md`, `setup.sh`, `checks.sh`): Task 1 is claimed by a fixture session and Task 2 is claimable. The second session should register, ask `next`, take Task 2, and neither stop at the held Task 1 nor take it over.
- `scenarios/sdd-empty-frontier-posts-and-hands-back/` (`story.md`, `setup.sh`, `checks.sh`): the fixture session holds every task. The second session should see `next` answer `none reason=held`, post a `tasks` waiting record, print the board and hand back without taking anything over.

## Pins and launch

- Harness: hyperpowers-evals at `8dee8207b088f27cde2bc55c7db6945b02b499cc` (the scenarios; the scaffold commit `91f5a26dad6db824a1fde86f4937e2c1dd2e0814` added only the launcher files). Coding agent `claude-auto` under Claude Code 2.1.317.
- Control: `main` before this branch, `5abc925c9158f8034451a760ccde5a123b731734`. Treatment: this branch, `d53ddf5cf630a055e0aff6e37009f17c526aaf7f`.
- Model: `claude-opus-5-5` for the coding agent (`ANTHROPIC_MODEL=claude-opus-5-5`, the manifest `model` row, checked by `logs/measure-launch.sh`). Grader: `claude-opus-5-5` (`GAUNTLET_AGENT_MODEL`).
- Launch: `launch-all.sh` over `manifest.tsv` at concurrency 8, run from the evals clone outside the controller's command sandbox: `ANTHROPIC_MODEL=claude-opus-5-5 bash evidence/2026-10-27-parallel-development/scenario-runs/launch-all.sh evidence/2026-10-27-parallel-development/scenario-runs/manifest.tsv 8`. The manifest holds 40 trial rows, 10 per arm and scenario, and the 4 pin rows.
- Attempt 2 started at 14:57:13Z and its last row finished at 15:29:02Z on 2026-11-06 (first and last timestamps in the row logs). All 40 rows ended `DONE`.

## Departures from the brief

- The coding agent is `--coding-agent claude-auto`, not `claude`: the `claude` adapter fails at setup on this Vertex-only host. `claude-auto` with `ANTHROPIC_MODEL=claude-opus-5-5` runs Opus 5.5.
- The grader is pinned to `claude-opus-5-5`.
- The arm test in both `setup.sh` files was corrected before the campaign (controller ruling 1 in the task report).

Attempt 1 started about 14:55Z inside the controller's command sandbox, and all 40 rows were voided at setup. `git init -b main` could not copy git's hook templates into `results/workspaces/<run>/coding-agent-workdir/.git/hooks` ("Operation not permitted"). A setup void is an instrument failure, so it was relaunched without counting against any cap. The controller moved the 40 row logs to `scenario-runs/logs/attempt-1/` so attempt 2 could reuse the same manifest rows without overwriting a log. Each attempt 1 run keeps only `verdict.json`, `phase.json` and `provenance.json` under `scenario-runs/attempt-1/<arm>/<run>/`; every `verdict.json` has `gauntlet` null and `error.stage` `setup`, the setup-void shape.

## Assumption check

The brief assumed that the harness home's cache (`../home/.cache`) is where the candidate's `sdd-dir` places the state checkout, and said to validate it through case one's `pre()` on the first run. The four case-one runs of the first wave (`sdd-held-task-takes-frontier-claude-auto-20261106T145714Z-{997d,eed2,91e1,26d8}`) reached quorum's `agent` phase, so `pre()` passed, and each run home held `home/.cache/hyperpowers/state/<key>/plans/parallel-43d696ad/progress.md` with the identity line and `claims/task-1`. `pre()` then passed on all 40 rows.

## Results

Passes by final verdict, from the `final` line of each row log (`logs/<arm>-<scenario>-p<n>.log`):

| Scenario | Control | Treatment | Fisher p (two-sided) |
|---|---|---|---|
| `sdd-held-task-takes-frontier` | 0/10 | 10/10 | 0.000011 |
| `sdd-empty-frontier-posts-and-hands-back` | 0/10 | 10/10 | 0.000011 |

The p-value is the two-sided Fisher exact test on the 2x2 table of passes and fails, computed with `python3` and `math.comb` (the hypergeometric probability of the observed table, summed over every table at most as probable).

Per-check passes, from the `pre` and `post` lines of the row logs (a `NOT` check passes when the forbidden call is absent). The four or five `pre` checks passed on all 40 rows and are omitted.

`sdd-held-task-takes-frontier`:

| Check | Control | Treatment |
|---|---|---|
| skill-called subagent-driven-development | 10/10 | 10/10 |
| ran `sdd-state register` | 0/10 | 10/10 |
| ran `sdd-state next` | 0/10 | 10/10 |
| ran `sdd-state claim` on Task 2 | 1/10 | 10/10 |
| did not run a takeover claim | 10/10 | 10/10 |
| ledger has `Task 2: branch` | 0/10 | 10/10 |

`sdd-empty-frontier-posts-and-hands-back`:

| Check | Control | Treatment |
|---|---|---|
| skill-called subagent-driven-development | 10/10 | 10/10 |
| ran `sdd-state next` | 0/10 | 10/10 |
| ran `sdd-state wait --kind tasks` | 0/10 | 10/10 |
| ran `sdd-state board` | 0/10 | 10/10 |
| did not run a takeover claim | 10/10 | 10/10 |
| `tasks` waiting record on disk | 0/10 | 10/10 |

## What the checks prove

The deterministic `post()` checks are narrower than the behaviours the scenarios name. In case one they show that `register`, `next` and `claim ... 2 --session` were invoked and that the ledger has a `Task 2: branch` line. They do not show that `next` returned Task 2, that Task 2 was worked or completed, or that no question or hand-back came before the claim. The takeover check is a negated regex, `claim [^\n]* 1 --session [^\n]*--takeover`, which depends on order and misses a `--takeover` written before `--session`. In case two they show that `next`, `wait --kind tasks` and `board` were invoked and that some `kind=tasks` waiting record exists. They do not show that `next` returned `none reason=held`, that the record is the agent's own and not the fixture session's, that the fixture's claims are untouched, or that the session handed back. The case two takeover regex, `claim [^\n]*--takeover`, does not depend on order. Each run's final verdict therefore also requires the Gauntlet-Agent's verdict on the story's acceptance criteria, which name those behaviours.

The committed treatment copies confirm the missing pieces for all 20 treatment runs. The control runs are not covered. From `evidence/2026-10-27-parallel-development/scenario-runs/`:

- Case one: every run's `trajectory.json` contains `status=next tasks=2` and `status=claimed task=2`; every run's ledger has a line starting `Task 2: complete` and none starting `Task 1: complete`; every run home holds one waiting record.
- Case two: every run's `trajectory.json` contains `status=none reason=held`; every run home holds exactly one waiting record, named for a session id other than `fixture-session`, whose first `kind=` line is `kind=tasks`; both `claims/task-1` and `claims/task-2` remain.
- The hand-back in case two is not confirmed by these commands; it rests on the grader's verdict.

The commands, which print one line per run (a trajectory may hold its JSON on few lines, so `grep -c` output is read as present or absent, not as a count of occurrences):

```bash
for d in treatment/sdd-held-task-takes-frontier-claude-auto-*; do printf '%s next2=%s claimed2=%s\n' "${d##*-}" "$(grep -c 'status=next tasks=2' "$d/trajectory.json")" "$(grep -c 'status=claimed task=2' "$d/trajectory.json")"; done

for d in treatment/workspaces/sdd-held-task-takes-frontier-*; do p=$(find "$d/home/.cache/hyperpowers/state" -name progress.md -path '*/plans/parallel-*' | head -1); printf '%s complete2=%s complete1=%s waiting=%s\n' "${d##*-}" "$(grep -c '^Task 2: complete' "$p")" "$(grep -c '^Task 1: complete' "$p")" "$(find "$d/home/.cache/hyperpowers/state" -path '*/waiting/*' -type f | wc -l | tr -d ' ')"; done

for d in treatment/workspaces/sdd-empty-frontier-posts-and-hands-back-*; do w=$(find "$d/home/.cache/hyperpowers/state" -path '*/waiting/*' -type f); printf '%s waiter=%s %s held_in_trajectory=%s claims=%s\n' "${d##*-}" "$(basename "$w")" "$(grep -m1 '^kind=' "$w")" "$(grep -c 'status=none reason=held' "treatment/${d#treatment/workspaces/}/trajectory.json")" "$(find "$d/home/.cache/hyperpowers/state" -type d -path '*/claims/task-*' | wc -l | tr -d ' ')"; done
```

Result: all 10 case one runs print `next2=1 claimed2=1` and `complete2=1 complete1=0 waiting=1`. All 10 case two runs print a waiter id other than `fixture-session`, `kind=tasks`, a nonzero `held_in_trajectory` and `claims=2`.

## What the sessions did

Case one, treatment (`sdd-held-task-takes-frontier`): all ten registered, ran `next`, claimed Task 2 and recorded `Task 2: branch` in the ledger, which the post checks show. That `next` returned Task 2 in all ten is confirmed from the trajectories under What the checks prove. That none of them touched Task 1 rests on the takeover check and the grader's verdict. Treatment p1 implemented and merged Task 2, then posted a wait for Task 1 and handed back. Grader excerpt: "It never tried to take over Task 1. When `next` returned nothing more for it, it posted a wait for Task 1 (Task 3 needs it) and handed back."

Case one, control: none ran `register` or `next`, and nine of ten never claimed Task 2. In the summaries of p1 to p3, the sessions tried `sdd-state claim` on the held Task 1 (p2, p3) or stopped after `sync`, `verify` and `snapshot` without trying a claim (p1), and stopped to ask which task to take. p2 was told that `fixture-session` held Task 1, and p3's summary shows `status=held` with exit 4. After the scripted "No, the other session is still working." p1 and p2 handed back with Task 2 unclaimed; p3 is described in the next paragraph. Grader excerpt from p1: "It then stopped and asked the developer what to work on because Task 1 was held. After I gave the scripted answer ("No, the other session is still working."), it did not claim anything and handed back to wait for instructions."

Control p3 (`control-sdd-held-task-takes-frontier-p3.log`) is the one control session that claimed Task 2. It handed back twice, and took Task 2 only after the Gauntlet-Agent sent an unscripted "yes, go ahead" past the scripted answer. It still failed on the absent `register` and `next` calls and the missing `Task 2: branch` ledger line. Grader excerpt: "It took Task 2 only after an extra confirmation. The ledger also lacks a 'Task 2: branch' line."

Case two, treatment (`sdd-empty-frontier-posts-and-hands-back`): all ten ran `next`, which returned `none reason=held`, posted a `tasks` waiting record, printed the board and handed back without taking a task over. Grader excerpt from p1: "It registered itself and ran `sdd-state next`, which returned `status=none reason=held`. It then posted a waiting record of kind tasks, printed the board and handed back, saying both tasks are held by fixture-session."

Case two, control: none ran `next`, `wait --kind tasks` or `board`, and no waiting record exists on disk. In the p1 and p2 summaries the sessions tried `sdd-state claim` on both tasks, got `status=held`, asked the developer what to do, and handed back. All ten correctly avoided a takeover, so the control failure here is the missing protocol, not unsafe behavior. Grader excerpt from p1: "The agent behaved safely: it took no tasks over and handed back. But it did not carry out the empty-frontier protocol the scenario tests."

## Scrub and strip notes

- `scripts/strip-runs --min-age-minutes 0 --run <run>` ran over all 40 attempt 2 runs first. In the copies, `home/.claude/plugins/` and `home/.codex/` were deleted where present.
- Every `.git` entry under `scenario-runs/` (96: the 40 fixture repositories at `coding-agent-workdir/.git`, the state checkouts' gitfiles at `home/.cache/hyperpowers/state/<key>/.git`, and the worktree gitfiles the agents' sessions created) was renamed `git-dir`.
- Dollar amounts: 22 money amounts in the row logs were replaced with `<cost>`, and the numeric value of every key whose name contains `cost` (`costUSD`, `totalCostUSD`, `est_cost_usd`, `total_est_cost_usd`, `lastCost`) was set to `null` in the JSON and JSONL copies (283 values). A search afterward found no amount and no numeric cost value left; the remaining `$` matches are shell parameters such as `$1` and `${2:-8}`. Only `.log` files had text replaced.
- Every committed file passed `realval-scan.py` with `hits: 0` individually, so no file was withheld.
- Attempt 2 copies of `results/<run>/` are under `scenario-runs/<arm>/<run>/` and of `results/workspaces/<run>/` under `scenario-runs/<arm>/workspaces/<run>/`; `results/` is untouched apart from the strip.

## Row to run map

Every attempt 2 row. `<arm>/` is `control/` or `treatment/` under `scenario-runs/`; the run record is `<arm>/<run>/` and the agent's workspace is `<arm>/workspaces/<run>/`.

| Arm | Scenario | Row | Run id | Verdict | Path |
|---|---|---|---|---|---|
| control | `sdd-held-task-takes-frontier` | p1 | `sdd-held-task-takes-frontier-claude-auto-20261106T145714Z-26d8` | fail | `control/sdd-held-task-takes-frontier-claude-auto-20261106T145714Z-26d8/` |
| control | `sdd-held-task-takes-frontier` | p2 | `sdd-held-task-takes-frontier-claude-auto-20261106T145714Z-91e1` | fail | `control/sdd-held-task-takes-frontier-claude-auto-20261106T145714Z-91e1/` |
| control | `sdd-held-task-takes-frontier` | p3 | `sdd-held-task-takes-frontier-claude-auto-20261106T150341Z-a06a` | fail | `control/sdd-held-task-takes-frontier-claude-auto-20261106T150341Z-a06a/` |
| control | `sdd-held-task-takes-frontier` | p4 | `sdd-held-task-takes-frontier-claude-auto-20261106T150501Z-a898` | fail | `control/sdd-held-task-takes-frontier-claude-auto-20261106T150501Z-a898/` |
| control | `sdd-held-task-takes-frontier` | p5 | `sdd-held-task-takes-frontier-claude-auto-20261106T150930Z-0208` | fail | `control/sdd-held-task-takes-frontier-claude-auto-20261106T150930Z-0208/` |
| control | `sdd-held-task-takes-frontier` | p6 | `sdd-held-task-takes-frontier-claude-auto-20261106T151246Z-25d0` | fail | `control/sdd-held-task-takes-frontier-claude-auto-20261106T151246Z-25d0/` |
| control | `sdd-held-task-takes-frontier` | p7 | `sdd-held-task-takes-frontier-claude-auto-20261106T151545Z-7a03` | fail | `control/sdd-held-task-takes-frontier-claude-auto-20261106T151545Z-7a03/` |
| control | `sdd-held-task-takes-frontier` | p8 | `sdd-held-task-takes-frontier-claude-auto-20261106T151813Z-1153` | fail | `control/sdd-held-task-takes-frontier-claude-auto-20261106T151813Z-1153/` |
| control | `sdd-held-task-takes-frontier` | p9 | `sdd-held-task-takes-frontier-claude-auto-20261106T152032Z-8fa2` | fail | `control/sdd-held-task-takes-frontier-claude-auto-20261106T152032Z-8fa2/` |
| control | `sdd-held-task-takes-frontier` | p10 | `sdd-held-task-takes-frontier-claude-auto-20261106T152303Z-6c40` | fail | `control/sdd-held-task-takes-frontier-claude-auto-20261106T152303Z-6c40/` |
| treatment | `sdd-held-task-takes-frontier` | p1 | `sdd-held-task-takes-frontier-claude-auto-20261106T145714Z-eed2` | pass | `treatment/sdd-held-task-takes-frontier-claude-auto-20261106T145714Z-eed2/` |
| treatment | `sdd-held-task-takes-frontier` | p2 | `sdd-held-task-takes-frontier-claude-auto-20261106T145714Z-997d` | pass | `treatment/sdd-held-task-takes-frontier-claude-auto-20261106T145714Z-997d/` |
| treatment | `sdd-held-task-takes-frontier` | p3 | `sdd-held-task-takes-frontier-claude-auto-20261106T150341Z-2bc9` | pass | `treatment/sdd-held-task-takes-frontier-claude-auto-20261106T150341Z-2bc9/` |
| treatment | `sdd-held-task-takes-frontier` | p4 | `sdd-held-task-takes-frontier-claude-auto-20261106T150501Z-d7a4` | pass | `treatment/sdd-held-task-takes-frontier-claude-auto-20261106T150501Z-d7a4/` |
| treatment | `sdd-held-task-takes-frontier` | p5 | `sdd-held-task-takes-frontier-claude-auto-20261106T150855Z-238e` | pass | `treatment/sdd-held-task-takes-frontier-claude-auto-20261106T150855Z-238e/` |
| treatment | `sdd-held-task-takes-frontier` | p6 | `sdd-held-task-takes-frontier-claude-auto-20261106T151203Z-dd74` | pass | `treatment/sdd-held-task-takes-frontier-claude-auto-20261106T151203Z-dd74/` |
| treatment | `sdd-held-task-takes-frontier` | p7 | `sdd-held-task-takes-frontier-claude-auto-20261106T151528Z-185f` | pass | `treatment/sdd-held-task-takes-frontier-claude-auto-20261106T151528Z-185f/` |
| treatment | `sdd-held-task-takes-frontier` | p8 | `sdd-held-task-takes-frontier-claude-auto-20261106T151728Z-75fe` | pass | `treatment/sdd-held-task-takes-frontier-claude-auto-20261106T151728Z-75fe/` |
| treatment | `sdd-held-task-takes-frontier` | p9 | `sdd-held-task-takes-frontier-claude-auto-20261106T152015Z-707e` | pass | `treatment/sdd-held-task-takes-frontier-claude-auto-20261106T152015Z-707e/` |
| treatment | `sdd-held-task-takes-frontier` | p10 | `sdd-held-task-takes-frontier-claude-auto-20261106T152232Z-f7d0` | pass | `treatment/sdd-held-task-takes-frontier-claude-auto-20261106T152232Z-f7d0/` |
| control | `sdd-empty-frontier-posts-and-hands-back` | p1 | `sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T145714Z-18ba` | fail | `control/sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T145714Z-18ba/` |
| control | `sdd-empty-frontier-posts-and-hands-back` | p2 | `sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T145714Z-e06a` | fail | `control/sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T145714Z-e06a/` |
| control | `sdd-empty-frontier-posts-and-hands-back` | p3 | `sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T150431Z-402a` | fail | `control/sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T150431Z-402a/` |
| control | `sdd-empty-frontier-posts-and-hands-back` | p4 | `sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T150652Z-e816` | fail | `control/sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T150652Z-e816/` |
| control | `sdd-empty-frontier-posts-and-hands-back` | p5 | `sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T151203Z-339f` | fail | `control/sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T151203Z-339f/` |
| control | `sdd-empty-frontier-posts-and-hands-back` | p6 | `sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T151358Z-ddc0` | fail | `control/sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T151358Z-ddc0/` |
| control | `sdd-empty-frontier-posts-and-hands-back` | p7 | `sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T151658Z-f27d` | fail | `control/sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T151658Z-f27d/` |
| control | `sdd-empty-frontier-posts-and-hands-back` | p8 | `sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T151846Z-0868` | fail | `control/sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T151846Z-0868/` |
| control | `sdd-empty-frontier-posts-and-hands-back` | p9 | `sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T152131Z-241b` | fail | `control/sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T152131Z-241b/` |
| control | `sdd-empty-frontier-posts-and-hands-back` | p10 | `sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T152518Z-5c60` | fail | `control/sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T152518Z-5c60/` |
| treatment | `sdd-empty-frontier-posts-and-hands-back` | p1 | `sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T145714Z-681c` | pass | `treatment/sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T145714Z-681c/` |
| treatment | `sdd-empty-frontier-posts-and-hands-back` | p2 | `sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T145714Z-ac5d` | pass | `treatment/sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T145714Z-ac5d/` |
| treatment | `sdd-empty-frontier-posts-and-hands-back` | p3 | `sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T150409Z-5213` | pass | `treatment/sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T150409Z-5213/` |
| treatment | `sdd-empty-frontier-posts-and-hands-back` | p4 | `sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T150641Z-dca6` | pass | `treatment/sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T150641Z-dca6/` |
| treatment | `sdd-empty-frontier-posts-and-hands-back` | p5 | `sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T151046Z-de69` | pass | `treatment/sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T151046Z-de69/` |
| treatment | `sdd-empty-frontier-posts-and-hands-back` | p6 | `sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T151347Z-94c1` | pass | `treatment/sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T151347Z-94c1/` |
| treatment | `sdd-empty-frontier-posts-and-hands-back` | p7 | `sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T151645Z-ee4a` | pass | `treatment/sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T151645Z-ee4a/` |
| treatment | `sdd-empty-frontier-posts-and-hands-back` | p8 | `sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T151831Z-27bd` | pass | `treatment/sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T151831Z-27bd/` |
| treatment | `sdd-empty-frontier-posts-and-hands-back` | p9 | `sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T152116Z-0d8c` | pass | `treatment/sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T152116Z-0d8c/` |
| treatment | `sdd-empty-frontier-posts-and-hands-back` | p10 | `sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T152316Z-339e` | pass | `treatment/sdd-empty-frontier-posts-and-hands-back-claude-auto-20261106T152316Z-339e/` |
