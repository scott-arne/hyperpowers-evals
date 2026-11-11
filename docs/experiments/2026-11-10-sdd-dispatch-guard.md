# 2026-11-10: SDD dispatch guard, the treatment-only campaign (PASS)

## Hypothesis

The dispatch guard (`hooks/sdd-dispatch-guard` and
`hooks/lib/dispatch-guard.mjs` in hyperpowers) refuses a background `Agent`
call and a `SendMessage` resume of the session's own subagent while the
session has a plan ledger, outside fork mode. The refusal tells the
controller to dispatch again in the foreground, so the turn stays open while
the subagent works. The preregistered claim, copied from the hyperpowers
evidence note's Criteria: 5 of 5 counted runs in which every refusal is
followed by a foreground dispatch and the stop-guard log has no `live-agent`
line, at least one of them with a paired `background-agent` refusal; and one
fork-mode run that logs `fork-mode` and refuses nothing. The criteria were
committed in hyperpowers `4720897` before the first replay or scenario run.

## Config

Treatment root `/Users/johnss51/.cache/hyperpowers/sdd-dispatch-guard/hp-treatment`
at pin `f2e915c4049077bd979b8331f35fce45cc3cacb3`, a worktree never edited.
Claude Code 2.1.317, coding agent `claude-auto`. Scenario
`sdd-dispatch-guard` with `CLAUDE_CODE_FORK_SUBAGENT=0`, and
`sdd-dispatch-guard-fork` (fork mode left on) for the fork run. Treatment
only, no control. A counted run has at least one `sendmessage-resume`
refusal; a run without one is void and replaced, at most three times, and a
fourth void fails the scenario. Five treatment runs launched 2026-11-11
00:48:59Z to 00:50:21Z through `launch.sh treatment 5`, one fork run at
01:11:31Z through `launch.sh fork 1`, both from a sandboxed shell with no
setup failure. Evals HEAD at launch was `2c6e5fd`, and `tally.mjs` at that
commit read the archived runs.

## Run pointers

Paths are under `evidence/2026-11-10-sdd-dispatch-guard/task-9-runs/`. The
tally status and pass columns are `tally-treatment.tsv`; the quorum grade is
the `final` line of the run's log under `logs/`.

1. `sdd-dispatch-guard-claude-auto-20261111T004900Z-6abf`: counted, pass; quorum grade fail (finished both tasks, not merged)
2. `sdd-dispatch-guard-claude-auto-20261111T004919Z-e527`: counted, pass; quorum grade fail (Task 2 BLOCKED)
3. `sdd-dispatch-guard-claude-auto-20261111T004939Z-4def`: counted, pass; quorum grade fail (Task 2 BLOCKED)
4. `sdd-dispatch-guard-claude-auto-20261111T004959Z-501a`: counted, pass; quorum grade pass
5. `sdd-dispatch-guard-claude-auto-20261111T005021Z-792a`: counted, pass; quorum grade fail (merged red code)
6. `sdd-dispatch-guard-fork-claude-auto-20261111T011132Z-181e`: fork run, `tally-fork.tsv` verdict PASS; quorum grade fail (Task 2 BLOCKED)

Each treatment run holds one `sendmessage-resume` and one `background-agent`
refusal, both paired, `live_agent` 0. The denied results of both reasons are
in `denied-results.tsv`. `verdicts.txt` holds the two verdict lines, the pin,
the Claude Code version and the date.

## Verdict

Treatment: `verdict=PASS counted=5 voids=0 instrument=0 evidence=0`. All five
runs counted with no void, and every one passed: both of its refusals were
followed by a foreground `Agent` dispatch (`next` is `Agent:false` on all ten
refusals), the stop guard logged no `live-agent` line, and the paired
`background-agent` refusal the criteria ask for is present in all five, not
one. The first run's `sendmessage-resume` log line carried the same `to` the
transcript's `SendMessage` call passed.

Fork: `verdict=PASS runs=1 evidence=0`. Zero refusals and one `fork-mode`
line (the `SendMessage` at 01:16:14Z). The controller passed
`run_in_background` on all four `Agent` calls, with the values `"false"` and
`"true"` as strings. Every fork-mode dispatch came back with
`toolUseResult` `{isAsync: true, status: "async_launched"}`, the two passed
`"false"` included, which closes the result-shape assumption for fork mode.
The two `Agent` calls whose transcript input carried `"true"` (01:15:53Z and
01:16:54Z) left no guard line, although the guard writes a line for every
call its screen passes. Either their hook payload did not carry `true` or
`"true"`, or the hook did not run for them; no payload was captured. The
probe points to the first reading: with fork mode on, its check C1 found
`run_in_background` undefined in all three `Agent` payloads, including the two
the probe prompt set to true (`task-1-probe/check-b.txt`; fork mode off,
`check-a.txt`, carried false, true, true). The guard's screen passes only
`true` or `"true"`, so such calls stop there without a log line. The probe
does not show what happened in the campaign's fork run. Fork mode does not
change how the criteria read this.

The field replay, in `task-6-replay/summary.txt`, decided 329 calls and 59
refusals: 48 expected, 11 outside a plan, 0 false.

Quorum's own grade is a separate measure from the preregistered criteria. It
failed four of the five treatment runs and the fork run. The cause is the
fixture, not the guard. The plan's Task 1 code (`len(text.split(" "))`)
misses a design requirement and makes Task 2's test fail, by design, and the
operator script answers "go ahead with what the plan says". The runs ended
three ways. Run 1 finished both tasks on its branch and did not merge into
main with the test failing; both post-checks, `git-branch main` and the
unittest command, failed. Runs 2 and 3 and the fork run ended with Task 2 on
a BLOCKED report (the plan contradiction), branch `textstats.76cc6a12.task-2`
in the logs, nothing merged; both post-checks failed. Run 5 merged into main
with the test failing, so `git-branch main` passed and only the unittest
post-check failed. Run 4 passed. The pairing rule does not read the end
state, so these grades do not enter the verdict.

## Limits

One fixture, one model, one Claude Code version. The hook is deterministic,
so what the campaign measures is the controller's behaviour after a refusal,
and five runs cannot bound a rare divergence. The fixture contradicts itself
(plan code against a required test), which makes quorum's grade fail
independently of the guard; the grade says nothing about the guard in either
direction. The scenario never exercised a fix-round resume. In each of
the five treatment runs and in the Zed run, the only `SendMessage` call was
the opening message's Task 1 docstring follow-up, so every
`sendmessage-resume` refusal answers that scripted follow-up and none
answers reviewer findings. The guard's decision does not read the message
(it refuses when the target is the session's own subagent and the dispatch
was synchronous), and the preregistered Criteria count any such refusal and
name the follow-up as part of the scenario, so the PASS stands as
preregistered. What the runs do not show is a controller re-dispatching a
fix round, with its findings, in the foreground after a refusal. The field
replay classed ec562ba3's 18:02Z fix-round `SendMessage` an expected
refusal. The logs carry `run-id:` lines and no `trials:` lines: `launch.sh`
runs `quorum run` without `--repeat`, and quorum prints `trials:` only under
`--repeat`; `archive-runs.sh` and `tally.mjs` read only `run-id:`. The fork
run is one sample. Every fork-mode dispatch returned async, so the
background-or-foreground distinction does not show in the result, and the two
`"true"` calls that left no guard line leave open whether their payload
dropped the key or the hook did not run; the probe's C1 check favours the
payload. The Zed run is in `task-10-zed/`: the tally is `verdict=PASS
counted=1`, with one `background-agent` and one `sendmessage-resume` refusal,
both paired. The run ended on a hand-back after Claude Code's worktree
isolation check refused `sdd-state complete`, so the plan did not finish
(`task-10-zed/observation.md`). The field re-scan after release is owed.
