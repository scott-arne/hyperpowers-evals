# Smoke runs, one per arm (plan Task 9, uncounted)

`sdd-turn-liveness` runs launched through the campaign launcher to validate
the scenario, the fixture and the analyzers before Task 10 pins anything. None
of them counts toward the campaign.

- The first smoke (rows p1 and p2) found three problems.
- Plan Step 3b fixed them, approved by the human partner on 2026-10-21.
- Rows p3 are the smoke after those fixes. They found a fourth problem: no
  dispatch could run in the foreground.
- Plan Step 3c turns Claude Code's fork mode off (plan deviation 9), and rows
  p4 are the smoke after that.

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

For p4 one value changes again: harness `80b7bee74`, which allowlists
`CLAUDE_CODE_FORK_SUBAGENT` so the scenario can turn fork mode off. The
treatment stays at `c353fc7` and the allowed model set is unchanged.

The Gauntlet-Agent model is `claude-opus-5-5` throughout.

| Row | Run | Sandbox | Result |
|---|---|---|---|
| control p1 | `sdd-turn-liveness-claude-auto-20261021T141804Z-e3ae` | on | indeterminate (setup) |
| treatment p1 | `sdd-turn-liveness-claude-auto-20261021T141804Z-35b5` | on | indeterminate (setup) |
| control p2 | `sdd-turn-liveness-claude-auto-20261021T141933Z-f3e6` | off | pass |
| treatment p2 | `sdd-turn-liveness-claude-auto-20261021T141933Z-4478` | off | pass |
| control p3 | `sdd-turn-liveness-claude-auto-20261021T185013Z-d4c8` | off | pass |
| treatment p3 | `sdd-turn-liveness-claude-auto-20261021T185013Z-4471` | off | pass |
| control p4 | `sdd-turn-liveness-claude-auto-20261021T203614Z-53a6` | off | pass |
| treatment p4 | `sdd-turn-liveness-claude-auto-20261021T203614Z-631c` | off | pass |

The launches, in order:

- **p1**, inside the host's command sandbox at 14:18:03Z
  (`logs-smoke/campaign.out`). Both rows stopped in setup at `git init -b
  main` with `fatal: cannot copy '.../templates/hooks/commit-msg.sample' ...:
  Operation not permitted`, the known sandbox signature.
- **p2**, with the sandbox disabled at 14:19:18Z (`logs-smoke/campaign-p2.out`).
  Its closing line reads `launchers non-zero: 2`.
- **p3**, with the sandbox disabled at 18:49:41Z (`logs-smoke/campaign-p3.out`).
  Its closing line reads `launchers non-zero: 4`.
- **p4**, with the sandbox disabled at 20:35:28Z (`logs-smoke/campaign-p4.out`).
  Its closing line reads `launchers non-zero: 6`.

The non-zero launchers are the earlier rows. launch-all.sh starts every
manifest row, and an earlier row's launcher refuses to reopen its existing
log, as designed. Each campaign's closing line also reads `manifest rows
without a DONE log: 0`. Every p2 and p3 log ends `DONE 0`, and the roots and
Claude Code read the same after each run as before it. The operator's Claude
Code session restarted at about 21:47Z, while control p4 was in its
post-checks; the detached campaign survived, and that run closed `DONE 0` at
21:49:20Z.

## Durations (the plan's Assumption)

| Run | Gauntlet session (result.json, run.jsonl) | Post-checks | Quorum total |
|---|---|---|---|
| control p2 | 14:19:36 to 14:58:35, 38 min 58 s (2338156 ms) | about 16 min | 14:19:34 to 15:14:36, 55 min 2 s |
| treatment p2 | 14:19:36 to 14:58:56, 39 min 20 s (2359760 ms) | about 16 min | 14:19:34 to 15:14:57, 55 min 23 s |
| control p3 | 18:50:16 to 19:29:39, 39 min 23 s (2362621 ms) | about 16 min | 18:50:13 to 19:45:40, 55 min 27 s |
| treatment p3 | 18:50:16 to 19:27:35, 37 min 19 s (2238831 ms) | about 16 min | 18:50:13 to 19:43:38, 53 min 25 s |
| control p4 | 20:36:16 to 21:33:19, 57 min 2 s (3422306 ms) | about 16 min | 20:36:14 to 21:49:20, 73 min 6 s |
| treatment p4 | 20:36:16 to 21:09:04, 32 min 47 s (1967501 ms) | about 16 min | 20:36:14 to 21:25:05, 48 min 51 s |

One full SDD run fits well inside `quorum_max_time` 150m. The Assumption
holds. The longest session is control p4 at 57 minutes, and the longest whole
run is the same one at 73 minutes.

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
  - As first measured, `final_review` was false and so `success` was false,
    although the Gauntlet-Agent passed the run: analyze.py took the final
    review to be one dispatched at or after the last completion mark. The
    refined rule (Step 3d) reads both as **true**; see "The refined
    final-review rule" below.
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
| final_review / success | true / true | false / false, now **true / true** |
| untracked / soak_tampered | [] / false | [] / false |
| task_tools / codex_absent | true / true | true / true |
| models | haiku-4-5-20251001, opus-5-5, sonnet-5-5 | haiku-4-5-20251001, opus-5-5, sonnet-5-5 |

## The fix (plan Step 3c, deviation 9)

p3 showed both arms backgrounding every dispatch. A spike traced it to Claude
Code's fork mode, which is on by default in an interactive terminal (what
quorum launches) and off in print and SDK sessions (what the field runs). In
fork mode the Agent tool has no `run_in_background` parameter at all, so the
flag the treatment's templates now carry was an ignored string.

Harness commit `80b7bee74` adds `CLAUDE_CODE_FORK_SUBAGENT` to
`CLAUDE_ENV_ALLOWLIST`, and the scenario's directive is now
`# claude-env: CLAUDE_CODE_ENABLE_TODO_TOOLS=1, CLAUDE_CODE_FORK_SUBAGENT=0`.
Both p4 `.claude-env` files carry the two export lines.

## Step 3 items, p4

Command: `python3 evidence/2026-10-19-sdd-turn-liveness/analyze.py <control p4> <treatment p4>`.
It gives identical output on `results/` and on the archived copies.

1. **Time and soak post-checks: pass.** The sessions took 57 min 2 s
   (control) and 32 min 47 s (treatment), both inside 150 minutes. Both soak
   post-checks and the soak-files-untouched check passed in both runs.
2. **Provenance readouts: pass in both runs.** `cc` 2.1.302, `model`
   claude-opus-5-5, `plugin_dir` equal to each root, `codex_absent` true,
   `task_tools` true. `models` is `claude-haiku-4-5-20251001,
   claude-opus-5-5, claude-sonnet-5-5` in both, inside the allowed set.
   `evals_commit` is `d8ff8a8bb`, the manifest commit, whose harness paths
   match the pin; `evals_clean` is true.
3. **Ledger: pass.** `ledger_marks` is 1-6 in both runs and matches the
   transcripts' successful ledger writes.
   - Control wrote through Bash at 20:40:47, 20:42:26, 20:55:50, 20:57:29,
     20:58:58 and 21:28:22.
   - Treatment used Edits at 20:41:03, 20:42:25, 20:47:59, 20:49:29,
     20:51:04 and 21:03:28. Two earlier refused Bash writes (20:40:49 and
     20:40:55) are correctly not counted.
   - `plan_complete` is true in both, and neither SDD cache holds a file.
4. **STOP lists: pass.** Each result has one STOP line, and neither run has a
   candidate (`candidates: []`, `unadjudicated: 0`).
   - Control: `STOP: "You're on main. Should I do this work in an isolated
     worktree on a new branch, or commit directly on main?" | question`.
   - Treatment: `STOP: "You're on main. Where should the six tasks' commits
     go?" | question`.
   - Both were AskUserQuestion calls answered as tool results, so neither is
     a turn end.
5. **Main-session soak executions: found in both runs, and the treatment's
   long run now shows a clean foreground watch.**
   - Control short: one run at 20:51:39, `run_in_background: true`, 120000 ms
     recorded, result at launch after 0.015 s.
   - Control long: one run at 21:16:03, the same background form, not
     watched. So control's `short_ok` and `long_ok` are both false.
   - Treatment short: one run at 20:43:31 in the foreground, timeout
     420000 ms, elapsed 240.2 s. `short_ok` is true.
   - Treatment long: a tracked launch at 20:51:13 in the
     `> out 2>&1; echo "exit=$?" > out.exit` form, background timeout
     2160000 ms, watched by one foreground call of 600000 ms from 20:53:40,
     which returned `exit=0`. Elapsed 723.9 s, `detached` false, and
     `turn_end_during` **false**: the controller held its turn open for the
     whole twelve-minute soak. `long_ok` is true.

### What Step 3c asked for: the Agent tool and each dispatch

Both p4 transcripts record the same Agent tool:

- Input-schema properties: `description`, `prompt`, `subagent_type`,
  `model`, `effort`, **`run_in_background`**, `isolation`. The parameter is
  back; in p2 and p3 it was absent.
- Tool description: "Subagents run in the background by default; you'll be
  notified when one completes." It adds: "Pass `run_in_background: false`
  only when your very next action depends on the result and nothing else
  could usefully happen while it runs."
- The parameter's own description: "Agents run in the background by default;
  you will be notified when one completes. Set to false only when your very
  next action depends on this agent's result ..."

Per dispatch, both arms passed a **boolean**, never a string, and the harness
honored it:

| Arm | Dispatches | `run_in_background: false` | `true` | Foreground results | Async launches |
|---|---|---|---|---|---|
| control p4 | 13 | 8 | 5 | 8 | 5 |
| treatment p4 | 13 | 13 | 0 | 13 | 0 |

- Control's five background dispatches are Task 3's implementer and
  reviewer, Task 6's implementer and reviewer, and the final review. The
  other eight came back in the foreground.
- Treatment passed `false` on 13 of 13 and every result came back in the
  foreground. (A raw grep of that transcript counts 15 `false` values; two
  are duplicate records of the same calls, and one separate `true` is the
  long soak's Bash launch.)

### Agent behavior, p4 (data; nothing changed for it)

- **Treatment ended no turn at all while work ran:** `live_turn_ends` is 0,
  against 13 in p2 and 10 in p3. `premature` is 0 and `censored_stops` 0.
- **Control ended 8 turns with work live**, idling up to 990.9 s, then
  628.4 s and 526.9 s. Those are its five background dispatches and its two
  background soak runs.
- **Both arms dispatched the final whole-branch review before marking the
  last task complete.**
  - Treatment dispatched it at 20:52:54 and marked Task 6 at 21:03:28,
    after the long soak returned.
  - Control dispatched it at 21:16:54 and marked Task 6 at 21:28:22.
  - As first measured, that made `final_review` and `success` false in both,
    although both Gauntlet-Agents passed. The refined rule (Step 3d) reads
    all four counted runs as **true**; see "The refined final-review rule"
    below.
- `untracked` is [] and `soak_tampered` false in both.
- Both p4 controllers worked in a Claude Code worktree and left it behind at
  `coding-agent-workdir/.claude/worktrees/ratelimit`. The archive keeps each
  on disk but out of the commit, as in p3: the repository ignores `.claude/`,
  and the worktree's `.git` file would commit as a gitlink.

### analyze.py key fields, p4

| Field | control p4 (53a6) | treatment p4 (631c) |
|---|---|---|
| dispatch_fg / bg / unclassified | 8 / 5 / 0 | **13 / 0 / 0** |
| live_turn_ends | 8 (longest idle 990.9 s) | **0** |
| candidates | none | none |
| premature / unadjudicated / censored | 0 / 0 / 0 | 0 / 0 / 0 |
| short_runs | 1: bg, 120000, 0.015 s | 1: fg, 420000, 240.235 s |
| long_runs | 1: bg, 120000, watched false, exit_ok false, elapsed null, turn_end_during true | 1: tracked, 2160000, watched, exit_ok, 723.906 s, **turn_end_during false** |
| short_ok / long_ok | false / false | **true / true** |
| ledger_marks / plan_complete | [1..6] / true | [1..6] / true |
| final_review / success | false / false, now **true / true** | false / false, now **true / true** |
| untracked / soak_tampered | [] / false | [] / false |
| task_tools / codex_absent | true / true | true / true |
| models | claude-haiku-4-5-20251001, claude-opus-5-5, claude-sonnet-5-5 | same |
| final / void | pass / null | pass / null |

## The refined final-review rule (plan Step 3d)

In three of the four counted runs (treatment p3, and both p4 arms) the
controller received the Task 6 review, dispatched the final whole-branch
review, and wrote the `Task 6: complete` ledger line only after that review
returned, 10 to 11 minutes later. Control p3 wrote its mark first. The
analyzer's position rule — a review at or after the last completion mark —
therefore read `final_review` false for the three, which would have made R
measure ledger bookkeeping order rather than whether a final review ran.

Approved by the human partner on 2026-10-21 and applied in `analyze.py`
(commit `2bdb93a10`): `final_review` is now also true when the plan is
complete and at least two clean review-role dispatches follow the last
implementer dispatch — the task's own review, then the final one. Re-reviews
and fix rounds name a fix, so they never make up that pair. The original
at-or-after-the-mark condition stays. `test_analyze.py` gained the late-mark
case and a no-final-review case; the four suites pass, 79 tests.

Re-running the analyzer over the archived runs, with no new quorum run:

| Run | Arm, row | Before | After |
|---|---|---|---|
| d4c8 | control p3 | true / true | true / true |
| 4471 | treatment p3 | false / false | **true / true** |
| 53a6 | control p4 | false / false | **true / true** |
| 631c | treatment p4 | false / false | **true / true** |

(`final_review` / `success` in each cell.) The two uncounted p2 runs were
already true and are unchanged. Nothing else moved: F's call-shape measures
are not part of `success`, so control p4's `short_ok` and `long_ok` stay
false, and every dispatch, turn-end and provenance reading is as recorded
above.

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
