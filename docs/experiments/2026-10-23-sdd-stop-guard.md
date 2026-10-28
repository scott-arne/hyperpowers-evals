# 2026-10-23: SDD stop guard, the pre-registered campaign (PASS, with no guard decision under a plan)

## Hypothesis

The 2026-10-19 turn-liveness campaign failed on P alone: one treatment run's
last turn end counted as a premature stop
(`docs/experiments/2026-10-19-sdd-turn-liveness.md`). The follow-up gives the
`subagent-driven-development` skill a Stop hook, the stop guard
(`hooks/sdd-stop-guard` and `hooks/lib/stop-guard.mjs`). At every turn end it
finds the session's plan through the SDD ledger and, while the plan is
unfinished and no background agent is live, refuses the stop, unless the turn
hands back to the human partner (an `sdd-state handback` line, or hand-back
text the hook recognizes) or the hook has already refused twice (the cap).
The helpers it reads (`sdd-state complete`, `sdd-state handback`, the
receipt `sdd-state finish` publishes, and `tracked-job`) and the skill text
that names them ship with it. The pre-registered claim, for ten runs of the
previous campaign's scenario: every valid run's decision record holds at least
one line naming the run's plan (H1, `plan_decisions >= 1`), no stop reached
the human partner as a `neither` stop and every hand-back allow was genuine
(H2), no block refused a legitimate hand-back (H3), the mechanism measures
held (H4), and at least seven runs succeeded (R). Correction 9 restated H1
after these runs were launched and before any was archived (campaign README,
Corrections, entry 9): a valid run's record holds at least one line, and every
line from the ledger's start until the transcript records Finish's result
names the plan. The rule and every measure were written into
`evidence/2026-10-23-sdd-stop-guard/README.md` at evals `7f5b6c8d2` and
amended before the first run through `9cbc8b0ed`, which carries the analyzer
blob the pre-registration pins (`5d19560b`, adjudicating `cap` and
`log-failed` allows), with the harness re-pinned at `ef4557c7b` and
`791ded99d`. All of that landed before the first smoke launch at 00:04Z on
2026-10-28; Corrections 9 and 10 came after it.

## Config

One arm, ten valid runs, no control: the question is whether the guard's own
decisions hold. Treatment is hyperpowers
`4a4f354cdb414859235c2a58a4ebeeaa273ee11a`, a detached worktree never
edited. Scenario `sdd-turn-liveness` with the elicited six-task fixture plan
and one fixture change: the plan gives `DEFAULT_WINDOW_SECONDS` two values, so
every run holds one legitimate question before Task 1. Coding-Agent
`claude-auto` on Vertex pinned to `claude-opus-5-5`, subagents allowed
`claude-opus-5-5`, `claude-sonnet-5-5` and `claude-haiku-4-5-20251001`;
Claude Code 2.1.302 at a fixed path; Codex absent; the task tools on and fork
mode off through the scenario's `# claude-env:` directive. Harness pin evals
`33523dad56fc6d36f532ef4db52de065fc59ae20`; the runs recorded evals
`9cbc8b0`, whose harness paths are identical to it. The full pin is
`evidence/2026-10-23-sdd-stop-guard/manifest.tsv`. The arm ran on 2026-10-28
from 01:40:44Z to 03:42:46Z, detached at concurrency 5 and outside the
command sandbox; a first `p1` launched inside the sandbox at 01:39:13Z is a
`void-setup` attempt, replaced by `r1`.

## Run pointers

`evidence/2026-10-23-sdd-stop-guard/`: the pre-registration, Corrections 9
and 10 and the full results in `README.md`, the tally in `tally.txt`, the
hand labels in `adjudications.tsv` (none from this campaign), the launch logs
and launcher outputs in `logs/`, the eleven attempts in
`task-20-runs/treatment/` beside their `workspaces/` copies, and the smoke and
the fork-mode run T1 in `task-19-runs/` with their reading in `smoke.md`. The
analyzers are `liveness.py`, `analyze.py` and `tally.py` in the same
directory, at `4b56247c`, `6dd98e4b` and `3457937e` after Correction 10.

## Verdict

PASS by the pre-registered rule, as Correction 9 restated it: `tally.py`
prints `decision: PASS` with H1, H2, H3, H4 and R true. The guard made no
decision under a plan in any counted run. Each session ran its plan from the
first prompt to Finish's result in one turn, its two turn ends both came after
Finish removed the ledger, and the hook's whole record in every run is two
`no-ledger` allows. `plan_decisions` is 0 in all ten.

| Measure | Threshold | Reading | Verdict |
|---|---|---|---|
| H1 (Correction 9): no off-plan hook line in the plan window | `h1` in every counted run | `plan_decisions` 0 in 10 of 10; no hook line fell in any run's plan window; `h1` 10 of 10 | PASS, with no decision under a plan |
| H2 `neither` stops on the STOP list | 0 | 0 of 22 entries | PASS |
| H2 hand-back allows adjudicated `neither`, or unadjudicated | 0 | 0, with no hand-back allow in any run | PASS, with no cases |
| H3 blocks adjudicated as hand-backs, or unadjudicated | 0 | 0, with no block in any run | PASS, with no cases |
| H4 foreground dispatch share | at least 0.9 | 1.0 (132 of 132) | PASS |
| H4 untracked launches | 0 | 0 | PASS |
| H4 runs with both slow commands handled as the rule says | at least 9 of 10 | 9 | PASS |
| H4 live-shell turn ends | 0 | 0 | PASS |
| R successful runs | at least 7 | 10 | PASS |

Correction 10 was made after these runs were archived and read with the
Correction 9 analyzer: six of the ten had listed entries quoting the displayed
lead-in of an answered AskUserQuestion call, which that analyzer left untimed
and so read as `void-instrument`, and the Correction moves only stop timing
and so only the void classification (campaign README, Corrections, entry 10).

What the runs show is that no stop reached the human partner as a `neither`
stop on the Gauntlet's list and that the mechanism held. All 132 SDD
dispatches ran in the foreground, every run watched the twelve-minute soak
through `tracked-job wait` to `status=exited code=0`, no turn ended with only
a tracked shell live, and all ten plans completed with a receipt and a final
review. The hook ran at all twenty turn ends, within a second of each, and its
`no-ledger` answer after Finish is the correct one.

What the runs do not show is any of the guard's decisions about a plan. Its
refusal of a premature stop (`open-tasks`), its refusal while a tracked shell
is live (`live-shell`), its release of a hand-back recorded with `sdd-state
handback` (`handback-line`) or recognized from the turn's text
(`handback-text`), its allow while a background agent is live
(`live-agent`), its cap and its fail-open path (`log-failed`) did not run live
in any counted run. H2's adjudication half and H3 held with no cases,
and H1 holds because no hook line fell inside its window. No receipt holds a
plan log. The absence of a premature stop here belongs to sessions that ran
their plans in one turn and cannot be credited to the hook. Read with H1 as
the spec first wrote it (`plan_decisions >= 1`), all ten runs fail H1 and the
campaign is FAIL on H1; Correction 9 restated H1 after the smoke and after
these runs were launched, before any was archived or tallied.

## Limits

Every legitimate hand-back in these runs was an AskUserQuestion call answered
inside its turn, which no Stop hook sees. Before Task 1, six runs asked a
separate workspace question and then a combined call carrying the fixture's
`DEFAULT_WINDOW_SECONDS` question, and four asked one combined call with the
workspace or branch question folded in beside it: 16 pre-flight calls, of
which the Gauntlet listed eleven, in seven runs, as in-turn stops. `cc92`
made a third call after its final review, while its ledger was live, about
departing from the plan's CLI code. The Gauntlet's list, which H2's first
half reads, omitted the pre-flight questions in three runs that asked them,
and in six runs it quoted text the Correction 9 analyzer could not time. F is
9 of 10 on a shape reading: in `82f7` the first call that names the short
soak redirected into a directory that did not exist yet, so the soak never
started, and the session reran it in the foreground for 241.8 s six seconds
later; the rule counts every execution and was applied as written.

The uncounted T1, with fork mode on, is the only run of the campaign in which
the hook judged a plan: 12 `live-agent` allows while background agents were
live, and no block. There is no control arm. The scenario is short and fresh,
while the premature stops in the field baseline (296 against 1434 task
boundaries) come from long, compacted sessions whose turns end mid-plan; the
field rule over the after-window, read with `field_hook.py`, is where the
guard's decisions under a plan will first be measured.
