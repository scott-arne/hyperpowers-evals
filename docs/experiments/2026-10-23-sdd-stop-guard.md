# 2026-10-23: SDD stop guard, the pre-registered campaign (PASS, with no guard decision under a plan; the Z4 contingency re-measure FAIL on H2 and H4)

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

The Z4 contingency's re-measure is in the same directory: its pre-registration
in the README's "Pre-registration addendum (Z4 contingency)" and Correction
11, its full results in the README's "Results (Z4 contingency)", the tally in
`tally-z4.txt`, the pin in `manifest-z4.tsv` with the launch views
`manifest-z4-a.tsv` and `manifest-z4-b.tsv`, the launch logs and launcher
outputs in `logs/z4/`, and the ten runs in `task-21-runs/treatment/` beside
their `workspaces/` copies: five with the prefix
`sdd-turn-liveness-claude-auto-20261105T185523Z-` (`13eb`, `6a7f`, `95e8`,
`4989`, `560c`) and five with `sdd-turn-liveness-claude-auto-20261105T195949Z-`
(`99a8`, `6dcc`, `e703`, `0c06`, `d20c`). It read the runs with `liveness.py`
`4b56247c`, `analyze.py` `6dd98e4b` and `tally.py` `23e39ffb` (Correction
11).

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

## Verdict (Z4 contingency)

Release check Z4 failed in Zed: a fix round resumed the implementer with
`SendMessage`, the resumed agent ran in the background, the guard allowed the
turn end as `live-agent`, and the turn the human partner's prompt opened
closed while the agent worked (4 min 12 s in Zed run 1, 19 s in run 2). The
contingency shipped at hyperpowers `36a6255` (fix rounds 1 to 3
on Claude Code dispatch a fresh foreground implementer on the recorded
model), and ten runs re-measured the campaign under `manifest-z4.tsv` with H1
to H4 and R unchanged (README, "Pre-registration addendum (Z4
contingency)"). They ran on 2026-11-05 from 18:55:23Z to 21:07:30Z in two
batches of five, outside the command sandbox, on Claude Code 2.1.317; all ten
are counted, none is void.

FAIL by the pre-registered rule: `tally.py --manifest manifest-z4.tsv --logs
logs/z4 --archive task-21-runs/treatment` prints `decision: FAIL`, with H2 and
H4 false and H1, H3 and R true. `tally-z4.txt` is the decision of record for
the release.

| Measure | Threshold | Reading | Verdict |
|---|---|---|---|
| H1 (Correction 9): no off-plan hook line in the plan window | `h1` in every counted run | `plan_decisions` 0 in 10 of 10; no hook line fell in any run's plan window; `h1` 10 of 10 | PASS, with no decision under a plan |
| H2 `neither` stops on the STOP list | 0 | 1 of 30 entries (`95e8`, after Finish's result) | FAIL |
| H2 hand-back allows adjudicated `neither`, or unadjudicated | 0 | 0, with no hand-back allow in any run | PASS, with no cases |
| H3 blocks adjudicated as hand-backs, or unadjudicated | 0 | 0, with no block in any run | PASS, with no cases |
| H4 foreground dispatch share | at least 0.9 | 1.0 (134 of 134) | PASS |
| H4 untracked launches | 0 | 0 | PASS |
| H4 runs with both slow commands handled as the rule says | at least 9 of 10 | 6 | FAIL |
| H4 live-shell turn ends | 0 | 0 | PASS |
| R successful runs | at least 7 | 10 | PASS |

H2 fails on one stop. In `95e8` the Gauntlet labelled `neither` the session's
report after the merge, 157.2 s after Finish's result, when Finish had
removed the ledger and the hook answered `no-ledger`, as it is designed to
once the plan is finished. The driver listed it because the session never
said that `sdd-state finish` had published its receipt, which the scenario's
done condition asks the agent to report; the other nine sessions said so.

H4 fails on F, 6 of 10. The four runs that miss it hold five readings of a
command's shape: two short soaks run as `time python3 -m unittest ...`, which
the soak reader does not count as an execution because `time` comes first;
two closing watches written `tracked-job wait ...; date -u`, whose last line
is the date rather than the helper's verdict; and one watch whose call
carries a command substitution, which the watch reader reads as unproven.
Each of the five calls ran in the foreground and got the answer the rule
asks for when read by eye. The analyzer documents the three watch shapes as
false negatives it accepts; the rule was applied as written.

What the runs show is that the mechanism held apart from those readings: all
134 SDD dispatches ran in the foreground, no launch was untracked, no turn
ended with only a tracked shell live, all ten plans completed with a receipt,
a final review and passing tests, and the hook ran at all 21 turn ends, within
2.2 s of each, answering `no-ledger` after Finish.

What the runs do not show is any decision the guard makes about a plan, as in
the first campaign: `plan_decisions` is 0 in all ten, every turn end came
after Finish's result, and the refusal paths, the hand-back allows,
`live-agent`, the cap and `log-failed` did not run live. H2's adjudication
half and H3 held with no cases, and H1 holds because no line fell in its
window. They also do not show the contingency's change: no task in any run
needed a fix round, no run called `SendMessage`, and the two final-review fix
waves (`560c`, `d20c`) went through the final wave's own fresh dispatch, which
the contingency did not change. Neither failure is a decision the guard got
wrong, and neither passes through the fix-round path. Read with H1 as the
spec first wrote it, all ten runs fail H1 here too.

The first campaign is PASS at treatment `4a4f354` on Claude Code 2.1.302, and
this re-measure is FAIL at treatment `36a6255` on Claude Code 2.1.317. The
two differ in the Claude Code version as well as the treatment, so no
difference between them can be attributed to the treatment alone.

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

The Z4 contingency's runs carry limits of their own. They ran on Claude Code
2.1.317 where the first campaign ran on 2.1.302, by the human partner's
choice, so the two tallies differ in the Claude Code version as well as the
treatment and no difference between them can be attributed to the treatment
alone. No task in the ten runs needed a fix round, so the change the
contingency made, a fresh foreground implementer for fix rounds 1 to 3, ran in
none of them, and these runs neither show nor refute that it keeps the turn
open. Their one `neither` entry turns on the scenario's done condition, which
counts the plan unfinished until the session reports the receipt, at a stop
after Finish where the guard by design no longer refuses. F is 6 of 10 on five
readings of command shapes, three of them watch shapes the analyzer documents
as accepted false negatives and two short soaks the soak reader does not see
behind a `time` prefix. As in the first campaign, every legitimate hand-back
was an AskUserQuestion call answered inside its turn (here also `6a7f`'s
question after its final review, ledger live), and the guard judged no plan.
