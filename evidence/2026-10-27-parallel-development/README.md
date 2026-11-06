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
