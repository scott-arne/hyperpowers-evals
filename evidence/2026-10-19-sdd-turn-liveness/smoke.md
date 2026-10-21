# Smoke runs, one per arm (plan Task 9, uncounted)

One `sdd-turn-liveness` run per arm, launched through the campaign launcher to
validate the scenario, the fixture and the analyzers before Task 10 pins
anything. Neither run counts toward the campaign.

## Pin and launches

`manifest-smoke.tsv` holds all 12 pin keys: harness `6d2cb683e`, control
`f1fd935` (v6.16.1) at `/Users/johnss51/.cache/hyperpowers/sdd-turn-liveness/hp-control`,
treatment `3e35b6c` at `/Users/johnss51/.cache/hyperpowers/sdd-turn-liveness/hp-treatment`
(created for this task with `git worktree add --detach`, `status --short`
empty), model `claude-opus-5-5`, cc `2.1.302` at `/Users/johnss51/.local/bin/claude`,
provider `vertex`, subagent models `claude-opus-5-5,claude-sonnet-5-5,claude-haiku-5-5`,
codex `absent`, task tools `on`. Gauntlet-Agent model `claude-opus-5-5`.

| Row | Run | Sandbox | Result |
|---|---|---|---|
| control p1 | `sdd-turn-liveness-claude-auto-20261021T141804Z-e3ae` | on | indeterminate (setup) |
| treatment p1 | `sdd-turn-liveness-claude-auto-20261021T141804Z-35b5` | on | indeterminate (setup) |
| control p2 | `sdd-turn-liveness-claude-auto-20261021T141933Z-f3e6` | off | pass |
| treatment p2 | `sdd-turn-liveness-claude-auto-20261021T141933Z-4478` | off | pass |

The p1 rows were launched inside the host's command sandbox at 14:18:03Z
(`logs-smoke/campaign.out`). Both stopped in setup at `git init -b main` with
`fatal: cannot copy '.../templates/hooks/commit-msg.sample' ...: Operation not
permitted`, the known sandbox signature. The p2 rows were launched with the
sandbox disabled at 14:19:18Z (`logs-smoke/campaign-p2.out`). That second
campaign's closing line reads `launchers non-zero: 2; manifest rows without a
DONE log: 0`: launch-all.sh starts every manifest row, and the two p1 launchers
refused to reopen their existing logs, as designed. Both p2 logs end `DONE 0`;
roots and Claude Code read the same after the runs as before.

## Durations (the plan's Assumption)

| Run | Gauntlet session (result.json, run.jsonl) | Post-checks | Quorum total |
|---|---|---|---|
| control p2 | 14:19:36 to 14:58:35, 38 min 58 s (2338156 ms) | about 16 min | 14:19:34 to 15:14:36, 55 min 2 s |
| treatment p2 | 14:19:36 to 14:58:56, 39 min 20 s (2359760 ms) | about 16 min | 14:19:34 to 15:14:57, 55 min 23 s |

One full SDD run fits well inside `quorum_max_time` 150m. The Assumption holds.

## Step 3 items

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
   - Fail, `task_tools: false`. The task tools never reached the agent.
     `coding-agents/claude-context/launch-agent` unsets every inherited
     `CLAUDE*` variable before sourcing the run's `.claude-env`, and
     `claudeSharedEnvLines` (`src/agents/index.ts`) does not write
     `CLAUDE_CODE_ENABLE_TODO_TOOLS` into that file. The run's `.claude-env`
     exports only the Vertex auth variables and the three
     `ANTHROPIC_DEFAULT_*_MODEL` pins. Neither transcript has a TaskCreate
     tool, call or reminder; each run's one `deferred_tools_delta` lists the
     same 12 tools, neither TaskCreate nor TaskUpdate among them (TaskStop,
     which stops a background job, is). measure-launch.sh's `task_tools` preflight
     checks the operator's shell, which the launcher strips.
   - Fail, `models` includes `claude-haiku-4-5-20251001`, which is outside
     the allowed set. Both controllers dispatched every implementer with
     `model: haiku` (6 per run). The haiku alias resolves through
     `ANTHROPIC_DEFAULT_HAIKU_MODEL`. The host value `claude-haiku-4-5` wins
     over the harness's Vertex default `claude-haiku-4-5@20251001`, and both
     are Haiku 4.5. The host also sets `ANTHROPIC_DEFAULT_OPUS_MODEL=claude-opus-5`,
     which is forwarded the same way. It had no visible effect here: both
     final reviews (`model: opus`) recorded `claude-opus-5-5`.
   - `tally.evaluate` over `manifest-smoke.tsv` and `logs-smoke/` classifies
     both p1 runs as `void-setup` and both p2 runs as `void-provenance` with
     problems `models,task tools`. Every campaign run would be voided the
     same way, so this needs a decision on the pin or the harness before
     Task 10.
3. **Ledger: pass.** `ledger_marks` is 1-6 in both runs and matches the
   transcripts' ledger writes one for one. Control appended
   `Task N: complete` lines through Bash heredocs at 14:22:38, 14:24:17,
   14:38:02, 14:39:44, 14:41:41 and 14:54:20. Treatment used Edits to
   `progress.md` at 14:24:37, 14:26:48, 14:37:09, 14:39:16, 14:41:18 and
   14:54:07. `plan_complete` is true in both. As expected, the ledger file
   is gone: Finish deleted the SDD workspace and `home/.cache/hyperpowers/sdd/`
   is empty in both.
4. **STOP lists: pass.** Control's result says `STOP: none`. Treatment's
   result has one line, `STOP: "You're on main. Where should the implementation
   commits go?" | question`. Neither run has a candidate (`candidates: []`,
   `unadjudicated: 0`). Treatment asked its question at 14:23:09, while the
   Task 1 implementer it had just dispatched was running in the background,
   so that turn end is a live-work turn end and not a candidate. The agent
   picked up again on the completion notice without an answer.
5. **Main-session soak executions: found in both runs.**
   - Control short: one run at 14:33:48, `run_in_background: true`, no
     timeout (120000 ms recorded), result at launch (0.03 s).
   - Control long: one run at 14:42:04, `run_in_background: true`, no
     timeout, no `> out 2>&1; echo "exit=$?" > out.exit` form. At 14:54:14
     the controller read Claude Code's own output file with `cat`; that
     result has no `exit=` line, so `watched: false`.
   - Treatment short: one run at 14:32:17 in the foreground, timeout
     600000 ms, elapsed 240.3 s.
   - Treatment long: one tracked launch at 14:41:50, background timeout
     2160000 ms, then the foreground watch: two 600000 ms calls (14:43:18 to
     14:52:55 "still running", 14:53:04 to 14:53:54 `exit=0`). Elapsed
     723.5 s, `exit_ok` true, `detached` false. `turn_end_during` is true
     because the controller ended two turns after the launch and before the
     watch began (14:41:53 and 14:43:01), each with background agents
     running. So `long_ok` is false.

## Agent behavior (data; nothing changed for it)

- Both arms backgrounded every SDD dispatch: `dispatch_bg` 13,
  `dispatch_fg` 0, `dispatch_unclassified` 0 in each. Every Agent call
  omitted `run_in_background`, and Claude Code 2.1.302 ran each one async
  ("Async agent launched successfully"). The treatment session loaded the
  treatment SKILL.md, whose text says to dispatch with
  `run_in_background: false`, and did not follow it.
- Live-work turn ends: control 15, treatment 13, all while background
  agents or soak jobs ran. Longest idle: control 645.9 s (waiting on the
  long soak) and 543.9 s (waiting on the Task 3 implementer, which included
  a soak run). Treatment 296.5 s (Task 3 implementer).
- `premature` 0, `censored_stops` 0 and `untracked` [] in both.
  `soak_tampered` false, `success` true, verdict pass in both. Neither run
  needed a "continue".
- Treatment worked in a Claude Code worktree (`.claude/worktrees/ratelimit`).
  Its transcript moved with the session, and the one top-level transcript
  holds the whole session from the first prompt. Control worked on a branch
  in the checkout. Both fast-forwarded `main`.

## analyze.py key fields

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

## Defects

The scenario, the fixture and the analyzers read both runs correctly, and no
file was changed. The two provenance failures come from the campaign pin
against the harness's launch environment, not from the scenario. Fixing them
is a plan decision: forward the task-tools opt-in through the harness (or
change the `task_tools` pin), and either pin the haiku alias to an allowed
model or add the Haiku id the harness resolves to the allowed set. No rerun
was made for them.

## Other observations

- The verdict's provenance records the Gauntlet checkout at `a35607e`,
  not clean (`gauntlet a35607e+dirty`). Gauntlet is not one of the pin's
  keys.

## Archive

`task-9-runs/smoke/<arm>/<run>/` with `workspaces/<run>/` beside it, built by
`archive-runs.sh` (strip-runs, `.git` renamed to `git-dir`, caches and plugin
state removed). Inside the sandbox each arm's archive stopped on
"Operation not permitted" copying `coding-agent-workdir/.git` files (the
p1 runs, which have no hooks, archived there), so both p2 runs were archived
with the sandbox disabled.
