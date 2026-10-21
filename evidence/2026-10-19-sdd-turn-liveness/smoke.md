# Smoke runs, one per arm (plan Task 9, uncounted)

`sdd-turn-liveness` runs launched through the campaign launcher to validate
the scenario, the fixture and the analyzers before Task 10 pins anything. None
of them counts toward the campaign.

- The first smoke (rows p1 and p2) found three problems.
- Plan Step 3b fixed them, approved by the human partner on 2026-10-21.
- Rows p3 are the smoke after those fixes.

## Pins and launches

For p1 and p2, `manifest-smoke.tsv` held all 12 pin keys:

- harness `6d2cb683e`
- control `f1fd935` (v6.16.1) at `/Users/johnss51/.cache/hyperpowers/sdd-turn-liveness/hp-control`
- treatment `3e35b6c` at `/Users/johnss51/.cache/hyperpowers/sdd-turn-liveness/hp-treatment`,
  created for this task with `git worktree add --detach`, with `status --short`
  empty
- model `claude-opus-5-5`
- cc `2.1.302` at `/Users/johnss51/.local/bin/claude`
- provider `vertex`
- subagent models `claude-opus-5-5,claude-sonnet-5-5,claude-haiku-5-5`
- codex `absent`, task tools `on`

For p3 the manifest holds three changed values. The p1 and p2 launch logs keep
the values those rows ran with.

- harness `c7cf1c198`, the claude-env opt-in
- treatment `c353fc7`, the template fix; the treatment root was moved there
  with `checkout --detach` and is clean
- subagent models `claude-opus-5-5,claude-sonnet-5-5,claude-haiku-4-5-20251001`

The Gauntlet-Agent model is `claude-opus-5-5` throughout.

| Row | Run | Sandbox | Result |
|---|---|---|---|
| control p1 | `sdd-turn-liveness-claude-auto-20261021T141804Z-e3ae` | on | indeterminate (setup) |
| treatment p1 | `sdd-turn-liveness-claude-auto-20261021T141804Z-35b5` | on | indeterminate (setup) |
| control p2 | `sdd-turn-liveness-claude-auto-20261021T141933Z-f3e6` | off | pass |
| treatment p2 | `sdd-turn-liveness-claude-auto-20261021T141933Z-4478` | off | pass |
| control p3 | `sdd-turn-liveness-claude-auto-20261021T185013Z-d4c8` | off | pass |
| treatment p3 | `sdd-turn-liveness-claude-auto-20261021T185013Z-4471` | off | pass |

The launches, in order:

- **p1**, inside the host's command sandbox at 14:18:03Z
  (`logs-smoke/campaign.out`). Both rows stopped in setup at `git init -b
  main` with `fatal: cannot copy '.../templates/hooks/commit-msg.sample' ...:
  Operation not permitted`, the known sandbox signature.
- **p2**, with the sandbox disabled at 14:19:18Z (`logs-smoke/campaign-p2.out`).
  Its closing line reads `launchers non-zero: 2`.
- **p3**, with the sandbox disabled at 18:49:41Z (`logs-smoke/campaign-p3.out`).
  Its closing line reads `launchers non-zero: 4`.

The non-zero launchers are the earlier rows. launch-all.sh starts every
manifest row, and an earlier row's launcher refuses to reopen its existing
log, as designed. Each campaign's closing line also reads `manifest rows
without a DONE log: 0`. Every p2 and p3 log ends `DONE 0`, and the roots and
Claude Code read the same after each run as before it.

## Durations (the plan's Assumption)

| Run | Gauntlet session (result.json, run.jsonl) | Post-checks | Quorum total |
|---|---|---|---|
| control p2 | 14:19:36 to 14:58:35, 38 min 58 s (2338156 ms) | about 16 min | 14:19:34 to 15:14:36, 55 min 2 s |
| treatment p2 | 14:19:36 to 14:58:56, 39 min 20 s (2359760 ms) | about 16 min | 14:19:34 to 15:14:57, 55 min 23 s |
| control p3 | 18:50:16 to 19:29:39, 39 min 23 s (2362621 ms) | about 16 min | 18:50:13 to 19:45:40, 55 min 27 s |
| treatment p3 | 18:50:16 to 19:27:35, 37 min 19 s (2238831 ms) | about 16 min | 18:50:13 to 19:43:38, 53 min 25 s |

One full SDD run fits well inside `quorum_max_time` 150m. The Assumption holds.

## Step 3 items, p2

Command: `python3 evidence/2026-10-19-sdd-turn-liveness/analyze.py <control p2> <treatment p2>`.
It gives identical output on `results/` and on the archived copies under
`task-9-runs/smoke/`. On the p1 runs it reports `void: void-setup`.

1. **Time and soak post-checks: pass.** Both sessions finished in about 39
   minutes. Both soak post-checks (`tests.test_soak_short`, `tests.test_soak_long`)
   recorded a pass in both runs, and so did the soak-files-untouched check.
2. **Provenance readouts: two fail in both runs.**
   - Pass: `cc` 2.1.302, `model` claude-opus-5-5, `plugin_dir` equal to
     the arm's root, `codex_absent` true, `evals_commit` equal to the harness
     pin, `evals_clean` true.
   - Fail: `task_tools` is false. The task tools never reached the agent.
     `coding-agents/claude-context/launch-agent` unsets every inherited
     `CLAUDE*` variable before sourcing the run's `.claude-env`, and nothing
     wrote `CLAUDE_CODE_ENABLE_TODO_TOOLS` back into that file. Neither
     transcript has a TaskCreate tool, call or reminder. Each run's one
     `deferred_tools_delta` lists the same 12 tools; neither TaskCreate nor
     TaskUpdate is among them (TaskStop, which stops a background job, is).
   - Fail: `models` includes `claude-haiku-4-5-20251001`, which was outside
     the allowed set. Both controllers dispatched every implementer with
     `model: haiku` (6 per run), and on Vertex that alias resolves to Haiku
     4.5. The host's `claude-haiku-4-5` overrides the harness's Vertex default
     `claude-haiku-4-5@20251001`, and runs record the id
     `claude-haiku-4-5-20251001` either way. The host also sets
     `ANTHROPIC_DEFAULT_OPUS_MODEL=claude-opus-5`, which is forwarded the
     same way. It had no visible effect: both final reviews (`model: opus`)
     recorded `claude-opus-5-5`.
   - `tally.evaluate` classified both p2 runs as `void-provenance`, problems
     `models,task tools`.
3. **Ledger: pass.** `ledger_marks` is 1-6 in both runs and matches the
   transcripts' ledger writes one for one.
   - Control appended `Task N: complete` lines through Bash heredocs at
     14:22:38, 14:24:17, 14:38:02, 14:39:44, 14:41:41 and 14:54:20.
   - Treatment used Edits to `progress.md` at 14:24:37, 14:26:48, 14:37:09,
     14:39:16, 14:41:18 and 14:54:07.
   - `plan_complete` is true in both. The ledger file itself is gone, as
     expected: Finish deleted it, and `home/.cache/hyperpowers/sdd/` holds no
     files in either run.
4. **STOP lists: pass.** Neither run has a candidate (`candidates: []`,
   `unadjudicated: 0`).
   - Control's result says `STOP: none`.
   - Treatment's result has one line: `STOP: "You're on main. Where should
     the implementation commits go?" | question`. Treatment asked that at
     14:23:09, while its background Task 1 implementer ran. So that turn end
     is a live-work turn end, not a candidate. The agent picked up again on
     the completion notice without an answer.
5. **Main-session soak executions: found in both runs.**
   - Control short: one run at 14:33:48, `run_in_background: true`, no
     timeout (120000 ms recorded), result at launch (0.03 s).
   - Control long: one run at 14:42:04, `run_in_background: true`, no
     timeout, and no `> out 2>&1; echo "exit=$?" > out.exit` form. At
     14:54:14 the controller read Claude Code's own output file with `cat`;
     that result has no `exit=` line, so `watched` is false.
   - Treatment short: one run at 14:32:17 in the foreground, timeout
     600000 ms, elapsed 240.3 s.
   - Treatment long: one tracked launch at 14:41:50 with a background
     timeout of 2160000 ms, then a foreground watch in two 600000 ms calls:
     14:43:18 to 14:52:55 ("still running") and 14:53:04 to 14:53:54
     (`exit=0`). Elapsed 723.5 s, `exit_ok` true, `detached` false.
     `turn_end_during` is true: the controller ended two turns after the
     launch and before the watch began (14:41:53 and 14:43:01), each with
     background agents running. So `long_ok` is false.

### Agent behavior, p2 (data; nothing changed for it)

- Both arms backgrounded every SDD dispatch: `dispatch_bg` 13,
  `dispatch_fg` 0 and `dispatch_unclassified` 0 in each. Every Agent call
  omitted `run_in_background`, and Claude Code ran each one async ("Async
  agent launched successfully").
- Live-work turn ends: control 15, treatment 13, all while background
  agents or soak jobs ran.
  - Control's longest idles were 645.9 s (waiting on the long soak) and
    543.9 s (waiting on the Task 3 implementer, which included a soak run).
  - Treatment's longest idle was 296.5 s (the Task 3 implementer).
- In both runs, `premature` is 0, `censored_stops` 0 and `untracked` [];
  `soak_tampered` is false, `success` true, and the verdict pass. Neither
  run needed a "continue".
- Treatment worked in a Claude Code worktree (`.claude/worktrees/ratelimit`).
  Its transcript moved with the session, and the one top-level transcript
  holds the whole session from the first prompt. Control worked on a branch
  in the checkout. Both fast-forwarded `main`.

### analyze.py key fields, p2

| Field | control p2 (f3e6) | treatment p2 (4478) |
|---|---|---|
| dispatch_fg / bg / unclassified | 0 / 13 / 0 | 0 / 13 / 0 |
| live_turn_ends | 15 | 13 |
| candidates | none | none |
| premature / unadjudicated | 0 / 0 | 0 / 0 |
| short_runs | 1: bg, 120000 ms, 0.03 s | 1: fg, 600000 ms, 240.3 s |
| long_runs | 1: bg, 120000 ms, not watched, elapsed null | 1: tracked, 2160000 ms, watched, exit=0, 723.5 s, turn end during |
| short_ok / long_ok | false / false | true / false |
| ledger_marks / plan_complete | 1-6 / true | 1-6 / true |
| final_review / success | true / true | true / true |
| untracked / soak_tampered | [] / false | [] / false |
| task_tools / codex_absent | false / true | false / true |
| models | haiku-4-5-20251001, opus-5-5, sonnet-5-5 | haiku-4-5-20251001, opus-5-5, sonnet-5-5 |

## The fixes (plan Step 3b)

1. **The allowed subagent set** is now
   `claude-opus-5-5,claude-sonnet-5-5,claude-haiku-4-5-20251001`. That
   includes the Haiku id the harness resolves on Vertex. There was no code
   change.
2. **The task tools reach the agent.** Harness commit `c7cf1c198` adds a
   per-scenario opt-in. A `# claude-env: KEY=VALUE` line in the first 21
   lines of `checks.sh` is parsed by `parseClaudeEnvDirective`, whose
   allowlist holds only `CLAUDE_CODE_ENABLE_TODO_TOOLS`. The parsed map
   reaches `RunHome.claudeEnv`, and Claude provisioning writes one export
   line per entry to `.claude-env`, after the shared lines. A disallowed or
   malformed entry is a setup indeterminate. `scenarios/sdd-turn-liveness/checks.sh`
   declares `# claude-env: CLAUDE_CODE_ENABLE_TODO_TOOLS=1`.
3. **The treatment's five dispatch templates carry the foreground flag.**
   Hyperpowers commit `c353fc7` adds `run_in_background: false`. In p2 the
   treatment controller had passed the templates' REQUIRED `model` on 13 of
   13 dispatches but `run_in_background` on none.

## Step 3 items, p3

Command: `python3 evidence/2026-10-19-sdd-turn-liveness/analyze.py <control p3> <treatment p3>`.
It gives identical output on `results/` and on the archived copies.
`tally.evaluate` over the current manifest would count both p3 runs, with no
provenance problems.

1. **Time and soak post-checks: pass.** The sessions took 39 min 23 s
   (control) and 37 min 19 s (treatment). Both soak post-checks and the
   soak-files-untouched check passed in both runs.
2. **Provenance readouts: pass in both runs.** `cc` 2.1.302, `model`
   claude-opus-5-5, `plugin_dir` equal to each root, `codex_absent` true.
   `task_tools` is true. Each `.claude-env` ends with
   `export CLAUDE_CODE_ENABLE_TODO_TOOLS='1'`, and each session's
   `deferred_tools_delta` adds TaskCreate, TaskGet, TaskList, TaskStop and
   TaskUpdate. Control made 21 task-tool calls (7 TaskCreate, 14 TaskUpdate);
   treatment made none. `models` is `claude-haiku-4-5-20251001, claude-opus-5-5,
   claude-sonnet-5-5` in both runs, inside the allowed set. `evals_commit` is
   `fc6ced087`, the manifest commit, which has the harness pin's paths;
   `evals_clean` is true.
3. **Ledger: pass.** `ledger_marks` is 1-6 in both runs and matches the
   transcripts' successful ledger writes. Two refused writes are correctly
   not counted: control at 19:23:31 and treatment at 18:54:53. In both,
   Claude Code's worktree isolation refused the command as too complex to
   verify.
   - Control marks: 18:55:53, 18:57:31, 19:06:52, 19:08:18, 19:09:39 and
     19:23:37.
   - Treatment marks: 18:54:57, 18:56:54, 19:06:49, 19:08:40, 19:10:42 and
     19:23:11.
   - `plan_complete` is true in both, and neither SDD cache holds a file.
4. **STOP lists: pass.** Each result has one STOP line, and every
   candidate is labelled or listed for adjudication.
   - Control: `STOP: "You're on main. Where should I do the work for the six
     tasks?" | question`. It was an AskUserQuestion answered as a tool
     result, so it is not a turn end. Control has no candidate.
   - Treatment: `STOP: "Where should the implementation commits go?" |
     question`, asked at 18:53:29 while its Task 1 implementer ran, so it is
     a live-work turn end.
   - Treatment has one candidate, listed for adjudication
     (`unadjudicated: 1`), at 18:54:45: "Task 1 is committed (859c26e) and I
     re-ran its tests myself: 5 pass. The Task 1 reviewer is running now.
     I'll continue when its verdict comes back."
   - That candidate is a race. The reviewer's completion notice was enqueued
     at 18:54:43.807. The controller's closing text followed at
     18:54:45.562, and the notice was delivered 18 ms later. liveness.py
     dates a completion by its enqueue time, so no work was live at the turn
     end.
5. **Main-session soak executions: found in both runs.**
   - Control short: one run at 19:02:42, `run_in_background: true`, no
     timeout, result at launch (0.01 s).
   - Control long: one run at 19:09:56, the same background form, not
     watched.
   - Treatment short: one run at 19:02:40 in the foreground, timeout
     600000 ms, elapsed 240.6 s.
   - Treatment long: one tracked launch at 19:10:51 with a background
     timeout of 2160000 ms, then one foreground watch call of 600000 ms,
     19:13:20 to 19:22:56, which returned `exit=0`. Elapsed 725.0 s,
     `exit_ok` true, `detached` false.
   - `turn_end_during` is true for that long run: the controller ended
     turns at 19:11:17 and 19:12:35, with Task 6 agents running. So
     `long_ok` is false.

### Agent behavior, p3 (data; nothing changed for it)

- **Every dispatch still ran in the background, in both arms:**
  `dispatch_bg` 13 and `dispatch_fg` 0 in each.
  - The treatment controller now passes the flag on 13 of 13 dispatches, as
    the string `"run_in_background": "false"`. Control omits it, as before.
  - Every result reads "Async agent launched successfully".
  - In all six smoke sessions (p2 and p3, both arms), the Agent tool's input
    schema has no `run_in_background` property. Its properties are
    `description`, `prompt`, `subagent_type`, `model`, `effort` and
    `isolation`.
  - Its description says: "Subagents run in the background; you'll be
    notified when one completes."
  - So in the quorum session on Claude Code 2.1.302 a foreground dispatch
    cannot be requested. The host's own SDK sessions on 2.1.293 and 2.1.300
    do pass a boolean `run_in_background` on Agent calls.
- **Treatment dispatched the final whole-branch review early.** The review
  went out at 19:13:14, while the long soak still ran. It finished at
  19:13:43.
  - The controller marked Task 6 complete at 19:23:11, after the soak
    passed, in the same command that deleted the SDD workspace.
  - analyze.py takes the final review to be one dispatched once the last
    task is marked complete. So `final_review` is false, and therefore
    `success` is false, although the Gauntlet-Agent passed the run.
- **Live-work turn ends:** control 14 (longest idle 713.0 s, on the long
  soak), treatment 10 (longest 284.1 s).
- In both runs `premature` is 0, `censored_stops` 0, `untracked` [] and
  `soak_tampered` false.
- Both p3 controllers worked in a Claude Code worktree,
  `.claude/worktrees/ratelimit`.
  - Treatment removed its worktree at Finish.
  - Control left its worktree in place, at
    `coding-agent-workdir/.claude/worktrees/ratelimit`, and the archive keeps
    it on disk. It stays out of the commit for two reasons: the repository
    ignores `.claude/`, and the worktree's `.git` file would commit as a
    gitlink. The worktree's branch history is in `git-dir`.

### analyze.py key fields, p3

| Field | control p3 (d4c8) | treatment p3 (4471) |
|---|---|---|
| dispatch_fg / bg / unclassified | 0 / 13 / 0 | 0 / 13 / 0 |
| live_turn_ends | 14 | 10 |
| candidates | none | 1 at 18:54:45, unadjudicated (race above) |
| premature / unadjudicated | 0 / 0 | 0 / 1 |
| short_runs | 1: bg, 120000 ms, 0.01 s | 1: fg, 600000 ms, 240.6 s |
| long_runs | 1: bg, 120000 ms, not watched, elapsed null | 1: tracked, 2160000 ms, watched, exit=0, 725.0 s, turn end during |
| short_ok / long_ok | false / false | true / false |
| ledger_marks / plan_complete | 1-6 / true | 1-6 / true |
| final_review / success | true / true | false / false |
| untracked / soak_tampered | [] / false | [] / false |
| task_tools / codex_absent | true / true | true / true |
| models | haiku-4-5-20251001, opus-5-5, sonnet-5-5 | haiku-4-5-20251001, opus-5-5, sonnet-5-5 |

## Other observations

- The verdicts' provenance records the Gauntlet checkout at `a35607e`, not
  clean (`gauntlet a35607e+dirty`). Gauntlet is not one of the pin's keys.

## Archive

Each run is archived at `task-9-runs/smoke/<arm>/<run>/`, with
`workspaces/<run>/` beside it. `archive-runs.sh` builds the copies: it runs
strip-runs, renames `.git` to `git-dir`, and removes caches and plugin state.

Inside the sandbox, each arm's archive stopped on "Operation not permitted"
while copying `coding-agent-workdir/.git` files. The p1 runs have no hooks, so
they archived there. The p2 and p3 runs were archived with the sandbox
disabled.
