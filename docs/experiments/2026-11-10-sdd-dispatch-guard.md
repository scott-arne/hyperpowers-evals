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

1. `sdd-dispatch-guard-claude-auto-20261111T004900Z-6abf`: counted, pass; quorum grade fail
2. `sdd-dispatch-guard-claude-auto-20261111T004919Z-e527`: counted, pass; quorum grade fail
3. `sdd-dispatch-guard-claude-auto-20261111T004939Z-4def`: counted, pass; quorum grade fail
4. `sdd-dispatch-guard-claude-auto-20261111T004959Z-501a`: counted, pass; quorum grade pass
5. `sdd-dispatch-guard-claude-auto-20261111T005021Z-792a`: counted, pass; quorum grade fail
6. `sdd-dispatch-guard-fork-claude-auto-20261111T011132Z-181e`: fork run, `tally-fork.tsv` verdict PASS; quorum grade fail

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
call its screen passes; their hook payload therefore did not carry the
value. Fork mode does not change how the criteria read this.

The field replay, in `task-6-replay/summary.txt`, decided 329 calls and 59
refusals: 48 expected, 11 outside a plan, 0 false.

Quorum's own grade is a separate measure from the preregistered criteria. It
failed four of the five treatment runs and the fork run. The cause is the
fixture, not the guard. The plan's Task 1 code (`len(text.split(" "))`)
misses a design requirement and makes Task 2's test fail, by design, so a
reviewer finding and a fix round follow. The operator script answers "go
ahead with what the plan says", so the agent keeps the plan's code and will
not merge red code. The two post-checks `git-branch main` and the unittest
command fail as a result, and nothing reaches main. Run 4 passed. The pairing
rule does not read the end state, so these grades do not enter the verdict.

## Limits

One fixture, one model, one Claude Code version. The hook is deterministic,
so what the campaign measures is the controller's behaviour after a refusal,
and five runs cannot bound a rare divergence. The fixture contradicts itself
(plan code against a required test), which makes quorum's grade fail
independently of the guard; the grade says nothing about the guard in either
direction. The logs carry `run-id:` lines and no `trials:` lines: `launch.sh`
runs `quorum run` without `--repeat`, and quorum prints `trials:` only under
`--repeat`; `archive-runs.sh` and `tally.mjs` read only `run-id:`. The fork
run is one sample. Every fork-mode dispatch returned async, so the
background-or-foreground distinction does not show in the result, and the two
`"true"` calls that left no guard line leave open why the payload dropped the
key. The Zed run and the field re-scan after release are owed.
