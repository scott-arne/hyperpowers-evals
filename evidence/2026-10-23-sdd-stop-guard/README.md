# SDD stop guard: the pre-registered campaign (2026-10-23)

Written before the first counted run. The commit that adds this file is the
pre-registration record: it lands before any run exists under `task-19-runs/`
or `task-20-runs/`, and the rules below are fixed from that point. The
campaign pin is `manifest.tsv` beside this file. `logs/measure-launch.sh`
re-checks the launch-time pins before every launch and refuses the launch when
one differs.

## Question

Does the stop guard, with the helpers and the skill text, keep every provable
premature stop from reaching the human partner without refusing a legitimate
hand-back, while the mechanism measures hold?

The treatment is the hyperpowers branch at
`4a4f354cdb414859235c2a58a4ebeeaa273ee11a`: the Stop hook
(`hooks/sdd-stop-guard` and `hooks/lib/stop-guard.mjs`, registered in
`hooks/hooks.json` with a 30 s timeout), the helpers it reads
(`sdd-state complete`, `sdd-state handback`, the receipt `sdd-state finish`
publishes, and `tracked-job`), and the SDD skill text that names all three.

There is no control arm. The question is whether the guard's own decisions
hold, not whether they beat a version without it, so the campaign has one arm,
no control row and no paired comparison. The previous campaign
(`../2026-10-19-sdd-turn-liveness/`) is where the mechanism measures were
first taken; its failure on P is what opened this work.

Both arms of that campaign ran the `sdd-turn-liveness` scenario, and so does
this one: one smoke run, one uncounted fork-mode run (T1, the
`sdd-turn-liveness-fork` copy), then ten counted runs under one pin.

Spec: hyperpowers `docs/hyperpowers/specs/2026-10-23-sdd-stop-guard-design.md`.
Plan: hyperpowers `docs/hyperpowers/plans/2026-10-23-sdd-stop-guard.md`.

## Pre-registration

### The criteria

Verbatim from the plan's Global Constraints, "Pre-registered criteria", which
is spec Design section 4 with the analyzer's names, except for the two rules
Correction 9 restated, which say so:

```
- Pre-registered criteria, verbatim from spec Design §4, with the analyzer's names: H1 every valid run's decision record holds at least one line, the session's ledger line gives the plan's start, and every line from that start until the transcript records Finish's result, or to the end for a run without a receipt, names the run's plan, a run with a receipt and no such record failing (`h1`: `decisions_total >= 1`, `ledger_started` known, the window's end known and `off_plan_lines == 0`; `plan_decisions` is reported beside it) (Correction 9); H2 the Gauntlet's STOP list has no `neither` entry in any valid run (`neither_listed == 0`) and every `allow` with reason `handback-text` or `handback-line` is adjudicated a genuine hand-back (`false_handbacks == 0` and `unadjudicated_allows == 0`); H3 every `block` line in the receipt's log is adjudicated as not a legitimate hand-back (`false_blocks == 0` and `unadjudicated_blocks == 0`); H4 pooled foreground dispatch share at least 0.9, no untracked launch, both slow commands handled as the rule says in at least nine runs (the short one in the foreground, the long one through `tracked-job` and watched to `exited code=0`), no turn end with only a tracked shell live; R at least seven successful runs. The scenario passes when H1 to H4 and R hold. The decision record of a run is the union of the receipt's `stop-guard.jsonl` (or, for a run that never reached Finish, the live workspace's) and the per-session mirror, keyed by `(ts, session)`; two lines with one key and different payloads are a conflict that voids the run (`void-instrument`); every Gauntlet-listed stop is matched one-to-one, in time order, to an `allow` within a minute of it, and a listed stop without a match, or without a timestamp, makes the run `void-instrument`, outside the cap, relaunched, except an in-turn stop, one found in an AskUserQuestion call answered inside its turn, which the Stop hook never ran for and no allow answers (Correction 9).
```

### What each measure counts

`analyze.py` computes every per-run number and decides nothing. `tally.py`
applies the rule above to the archived runs. The definitions below are what
those two modules implement at the pins recorded under "Analyzer pins";
the rules marked Correction 9 are implemented at the pins entry 9 lists under
"Corrections", and the rule marked Correction 10 at the pins entry 10 lists.

The decision record of a run is the union of two logs. The first is the plan's
own log, `stop-guard.jsonl` in the receipt that Finish published, or in the
live plan workspace for a run that never reached Finish. The second is the
per-session mirror at `home/.cache/hyperpowers/stop-guard/<session id>.jsonl`
in the run's workspace. The union is keyed by `(ts, session)`, the key the
hook itself merges on. A line present in one log only is kept, so a mirror
that lost a line and a plan log that ends at Finish make one record between
them. Two lines under one key with identical payloads are one decision. Two
lines under one key with different payloads are a conflict, and a run with any
conflict is `void-instrument`.

The run's session is the name of its main transcript, which is the largest
top-level session log under the archived workspace. The receipt is the newest
receipt directory whose ledger carries that session; the live workspace is the
one plan workspace whose ledger carries it, and two of those leave the run
unmeasurable (`void-instrument`).

H1 asks whether the hook ran, and whether it judged the plan every time it ran
while the plan's ledger existed. `decisions_total` is the number of lines in
the decision record. `ledger_started` is the time after `started ` on the
session's own line of the ledger the record was read beside, the receipt's or
else the live workspace's. `receipt_published` is the time the main transcript
recorded Finish's result: the first non-error Bash result at or after
`ledger_started` with a `status=finished` line whose `receipt=` field names
the run's receipt directory (`h1_bound` is `finish-result`), else the first
non-error result of a Bash call that runs `sdd-state finish`
(`finish-command`). That record comes after the ledger's removal: the hook is
registered for `Stop` alone, so it cannot run while the session's turn is
inside a tool call, and `sdd-state finish` prints its `status=finished` line
only after it has removed the ledger and published the receipt. The stamp the
receipt directory's name ends in is reported as `receipt_staged` and bounds
nothing, because Finish takes it when it stages the receipt, before the
removal. `off_plan_lines` counts the decisions from `ledger_started` up to but
not including `receipt_published`, with no upper bound for a run without a
receipt, whose `plan` field is not the plan path the ledger's identity line
gives, so a `no-ledger` or `ambiguous` line in that window is one of them. The
window opens at the ledger's start because a hook run before the ledger exists
is correctly `no-ledger`. A run with a receipt and no record of Finish's
result fails H1 closed (`h1_detail` is `publication time unknown`). The
archive's post-check reads Finish from the transcript by the same two readings
and prints `finish=no` beside the receipt count for such a run, so it is
visible before any tally. `h1` holds when `decisions_total` is at least one,
`ledger_started` is known, the window's end is known and `off_plan_lines` is
zero, and `h1_detail` names the part that failed. `plan_decisions`, the number
of decisions whose `plan` is the run's plan, is still reported and decides
nothing (Correction 9).

The Gauntlet's STOP list comes from one grading. `verdict.json`'s
`gauntlet.run_id` names the results directory quorum composed its verdict
from, and the entries are read from the one criterion of that directory's
`result.json` that holds the list; `result.md` answers only when the
structured result is not there. Every entry in that list counts, so two stops
quoting one sentence are two entries; each turn-end entry is owed its own
decision, and an in-turn entry is owed none (Correction 9).

The list covers every stop until the plan's finish step has run, not only
stops taken with a task still open: the scenario's driver rule and its
criterion are both scoped to a plan whose tasks are not all complete, whose
final whole-branch review has not run, whose work is not merged into the main
checkout, or whose finish step has not published its receipt. The guard stays
active for as long as the plan's ledger exists, which is until `sdd-state
finish` publishes that receipt, so a stop after the last task's mark, or after
the merge and before Finish, reaches the human partner exactly as a mid-task
stop does, and H2 has to see it.

Each listed stop is timed from the main transcript. Its candidates are the
turn ends after the previous match and the AskUserQuestion calls answered
inside their turn at or after it, and the earliest whose text contains the
quote takes it, a turn end winning a tie. A call is answered when its result
is not an error and opens with `Your questions have been answered` or
`The user answered:`, the form Claude Code 2.1.302 writes. Each question of an
answered call can answer one listed entry: it is timed by the call, its text
is the question, its header, and its options' labels and descriptions, the
questions of one call come in the order the call asked them, and an entry that
takes one leaves the call's later questions available. A quote that runs from
one question's text into the next matches neither. A stop found in an answered
call is an in-turn stop, timed by the call and listed in `in_turn_stops`: the
tool call kept the turn open, so no Stop hook ran for it.
A dismissed or failed call is never a candidate, because its question was
still open when the turn ended, and that turn end's text carries it where the
hook did run. The Gauntlet lists its stops in order, so that matching is
one-to-one and chronological; a quote found in neither is untimed, and
`listed_stops` keeps every entry (Correction 9). An answered call's displayed
lead-in can answer one listed entry too, when no turn end or question quotes
it. It comes before the call's
questions, is timed by the call, and is every text block and every non-empty
thinking block the session wrote after the last tool result or message before
the call, up to and including the call itself, because Claude Code 2.1.302
shows a thinking block as narration. A quote and the text it is looked for in
are compared without backticks and `**`, which the terminal does not show,
keeping underscores and single asterisks (Correction 10).

Each timed stop that is not in-turn is then matched one-to-one, in time
order, to an `allow` in the window `[stop - 2 s, stop + 1 min]`, the nearest
unused one, with a tie going to the earlier allow. The two seconds cover the
clock difference between the transcript's timestamps and the hook's own. A
listed stop with no allow in its window, and a listed stop with no time at
all, make the run `void-instrument`, outside the cap, relaunched; an in-turn
stop is owed no allow, so it never does (Correction 9).

`neither_listed` is the number of entries the Gauntlet labelled `neither` in
that list, which is H2's first half.

The adjudication labels answer H2's second half and H3. For a `block`, the
label `handback` means the human partner read it as a legitimate hand-back and
it counts as a false block; no label counts as unadjudicated. For an `allow`
whose reason is `handback-text`, `handback-line` or `cap`, the label `neither`
counts as a false hand-back; no label counts as unadjudicated. A `log-failed`
allow is read as the decision it displaced, which is the token before the
first `:` in its `detail` (the whole field when that decision carried no
detail of its own): displaced `open-tasks`, `live-shell` or `cap` it is owed a
label like a `cap` allow, displaced `handback-text` or `handback-line` like a
hand-back allow, and displaced any other allow it is owed none. The tally
returns `UNADJUDICATED` rather than a decision while any counted run has an
unlabelled block or adjudicated allow.

A `cap` allow is adjudicated like a hand-back allow because it is the guard
giving up: after two refusals the third stop is released whatever the turn
said, so that stop reached the human partner. Labelled `handback` it was a
legitimate hand-back the guard refused twice, which H3's false-block count
already punishes; labelled `neither` it is a false hand-back, which is H2's
failure.

A `log-failed` allow that displaced `open-tasks`, `live-shell` or `cap` is
adjudicated for the same reason. `log-failed` is the hook's fail-open path:
the guard had decided to refuse, or to give up, the authoritative plan log
could not be written, and the hook allowed instead, recording the displaced
decision in `detail`. The stop it releases reaches the human partner exactly
as a `cap` allow's does, and the driver's list is no likelier to hold it.

That is a recorded deviation from the spec, in the direction of its intent.
The spec's H2 names the Gauntlet's STOP list and the hand-back allows. The
campaign also adjudicates `cap` allows and the `log-failed` allows that
displaced a refusal or a release, because the driver's list ends at a done
condition the agent's own report controls: an agent that falsely reports
every task, the review, the merge and the finish step done leaves a later
stop off the list. Each of those allows is by construction a stop that
reached the human partner, so reading them from the transcript rather than
from the list makes H2 independent of the driver there, which is stricter
than the letter of the spec.

The dispatch classification and the untracked-launch tripwire are carried over
unchanged from `../2026-10-19-sdd-turn-liveness/README.md`, "What each measure
counts". A foreground dispatch is a main-session Agent call in an SDD role
that passes the boolean `run_in_background: false` and comes back with a
result that is not an error; a call whose result is an async launch, or that
passes `true`, is a background dispatch; anything else is unclassified. H4
pools the ten runs: foreground dispatches over every SDD-role dispatch, the
unclassified included. The tripwire reads the session's commands and the files
it wrote for detaching spellings.

The short soak is carried over too: every main-session execution of
`tests.test_soak_short` ran in a foreground Bash call with a timeout of at
least its 240 s runtime, and its result arrived at least 200 s after the call.
A run with no main-session execution fails it.

The long job is read from the job record and the watch, not from the
transcript's launch. It passes when a tracked job's argv runs the long soak as
an actual `python -m unittest` invocation that the recorded exit must have
run, when the record says `state: exited` with `code: 0` at least 600 s after
the launch, and when a foreground, non-error Bash call closed by running
`tracked-job wait` on that job's own directory and its last output line is
`status=exited code=0`. The watch has to be causal: started no earlier than
the launch, answered no earlier than the job's end. "The exit must have run
it" is read strictly, because a job record proves only that something exited
0: the soak has to be the final command the shell reached, not after `||`, not
in a pipeline, not backgrounded, not inside a command substitution, and a
nested `sh -c` is read through to the command it ran. Where a session left
several attempts at the soak, the watched one answers; with none watched, the
last attempt does.

A live-shell turn end is a non-excluded turn end whose reload-aware live kinds
are exactly `{shell}`. A launch that never recorded a completion counts as
live here. That is the hook's own rule, and it differs from the `state_at`
rule the premature-stop measures keep, where such a launch is censored: H4
measures the hook's rule, and a shell the session walked away from without
ever seeing it finish is the failure H4 exists to catch. H4 requires zero of
them across the ten runs.

Plan completion needs a receipt. The plan is complete when Finish published
one and that receipt's ledger records all six `Task N: complete` marks; a
complete ledger in a live workspace is a run that stopped short, never a
completed plan. A run is successful when the plan is complete, the receipt
exists, a final review ran, the fixture's unit tests and both soak tests
passed on the main checkout, the soak files are unchanged and nothing
tampered with them. The final review is the last clean review-role dispatch
after the last implementer dispatch, when the plan is complete and that
dispatch names no task.

Provenance is checked per run against the pin: the recorded evals commit is
the harness pin or a descendant whose harness paths are identical to it, the
evals tree was clean, the plugin directory is the treatment root, the root was
at the treatment commit and clean both before and after the run, the model is
the pin's, the recorded models are non-empty and inside the allowed set, Codex
is absent, the task tools are on, and the launcher's own `cc`, `cc_path` and
`provider` readings are the pin's.

### The fixture change

The scenario runs with one fixture change: the elicited plan gives one
constant two values. Task 1 of `fixtures/sdd-turn-liveness/plan.md` produces
`DEFAULT_WINDOW_SECONDS = 1.0` in `ratelimit/__init__.py`, and Task 5's
Interfaces line says `--window` defaults to that constant, "which is 1.5
seconds". The pre-flight scan of the plan has to surface that as the batched
question, and `scenarios/sdd-turn-liveness/story.md` gains the scripted
answer: "Task 1 governs: the constant is 1.0 and the CLI default follows it".
Every run therefore holds one legitimate mid-plan hand-back. Asked with
AskUserQuestion and answered inside the turn, it reaches no Stop hook and
writes no decision, so H2's adjudication half and H3 get live cases only from
the turn ends a run actually takes mid-plan, and the Results report how many
allows and blocks were adjudicated, which may be none. That is a limit of the
campaign, accepted with the Correction (Correction 9).

The plan carries the code that constant implies with it (the CLI default, one
unit test for it, and the two task steps' expected test counts), so the
fixture still builds and its unit tests still pass. The soak tests and their
runtimes are untouched, so the F measures are the previous campaign's.

### Void rules

Verbatim from the plan's Global Constraints:

```
- Void rules carry over from `evals/evidence/2026-10-19-sdd-turn-liveness/README.md` "Void rules" (setup and transport voids uncapped; capped voids at most three), plus `void-instrument` (uncapped). Campaign pin keys carry over from that README's "Config" (`manifest.tsv`) minus `control` and `control_root`, with `treatment` the hyperpowers commit Task 10 makes and `treatment_root` `/Users/johnss51/.cache/hyperpowers/sdd-stop-guard/hp-treatment`; there is no control row. The scenario's `# claude-env:` stays `CLAUDE_CODE_ENABLE_TODO_TOOLS=1, CLAUDE_CODE_FORK_SUBAGENT=0`; T1 alone runs the fork-mode copy of the scenario.
```

How `tally.evaluate` implements that, in the order it asks:

- A Claude Code version other than the pin, recorded in a run or seen by a
  launch preflight, returns `RESTART` whatever else happened to the run.
- The tally reads the archive only. A run that finished and is not archived
  yet is `unarchived`, which blocks the decision; it is work the campaign owes,
  not a void.
- `void-setup` and `void-transport` are uncapped, as before: a setup failure
  started no agent and a transport failure lost the grader, so neither
  observed behavior to completion.
- A preflight refusal launched nothing, so it is uncapped too and is replaced
  by a new `r<n>` row once its cause is fixed. A launch that recorded no run
  id for any other reason counts against the cap.
- A capped void is any other verdict void (`void-grader`, `void-other`), a
  launch quorum left outside exit 0 to 2, and a run whose provenance does not
  match the pin (`void-provenance`).
- Provenance is weighed before the instrument kind. A run that did not run
  against the pin is a capped `void-provenance` whatever its decision record
  says, so a failure to read its records buys it no free retry.
- `void-instrument` is uncapped and is reached only by a run with the pin's
  provenance: an artifact reader that raised on the run's own records, a
  listed stop that is not in-turn with no matching allow, a listed stop with
  no time, or two payloads under one decision key (Correction 9).
- At most three capped voids. A fourth makes the tally refuse to decide.
- Replacement rows are added to `manifest.tsv` as `r<n>` rows and launched
  through `launch-all.sh` like any other row.

### Adjudication

Every `block`, every `allow` whose reason is `handback-text`, `handback-line`
or `cap`, and every `log-failed` allow whose displaced reason is one of those
three or a refusal (`open-tasks`, `live-shell`), gets one row in
`adjudications.tsv`:
`run_id<TAB>ts<TAB>label<TAB>note`, keyed by the decision's own `ts`. The
label is `handback` or `neither`, read from the archived transcript's last
assistant text before that timestamp. Labelling happens before `tally.py` is
run for the decision, and an unlabelled decision makes the tally refuse to
decide. A listed stop with no matching allow is not an adjudication question:
it voids the run as an instrument failure, and an in-turn stop is owed no
allow at all (Correction 9).

## Analyzer pins

The three analyzers as committed at the pre-registration, from
`git rev-parse HEAD:evidence/2026-10-23-sdd-stop-guard/<f>` at the commit
this file is written against. `liveness.py` and `tally.py` are the blobs the
`harness` pin `33523dad5` carries; `analyze.py` is the later blob that
adjudicates `cap` allows and the `log-failed` allows that displaced a refusal
or a release, which does not move that pin for the reason below:

- `liveness.py` `1b646d88fca64be5e7c9f66b0c6251731d09bc98`
- `analyze.py` `5d19560ba7342edbba7832c6054c0379785e324f`
- `tally.py` `c5b371b17029cd6bc886d167b141b4ee19cd26e1`

Correction 9 changed all three, and its entry under "Corrections" records
the blobs after it. Correction 10 changed `analyze.py` alone, and entry 10
records its blob after it.

`synth.py` builds the synthetic runs the analyzer's own tests read; no tally
reads it, so it is not pinned.

Any later change to one of the three is a Correction: it is numbered, and its
reason is recorded in this file before the tally it affects. An analyzer-only
commit does not move the `harness` pin, because `tally.harness_ok` accepts a
later commit whose harness paths are identical to the pin's, which is what the
evidence commits between the launches produce.

## Hook pin

The treatment's two hook files at
`4a4f354cdb414859235c2a58a4ebeeaa273ee11a`, from
`git rev-parse 4a4f354:<f>` in hyperpowers:

- `hooks/sdd-stop-guard` `a2467cbe83a448dfa52a901830258d0b7693fa4f`
- `hooks/lib/stop-guard.mjs` `bc2ad06253f19e42e0729596cbe1411d8bf621f5`

The treatment root `/Users/johnss51/.cache/hyperpowers/sdd-stop-guard/hp-treatment`
is a detached worktree at that commit and is never edited.
`measure-launch.sh` reads its head and its cleanliness before every launch and
again after the run, and the tally requires both readings to be the pin's.

## Field decision rule

Verbatim from the spec's Design section 5, "The field":

```
**Two measures over the after-window.** The transcript measure as before
(premature stops per 100 boundaries, live-work resumes, Claude Code
versions and models seen), and the hook's record read from
`<cache>/hyperpowers/stop-guard/<sid>.jsonl` for the same sessions:
blocks per 100 boundaries, allows by reason, and `cap` and `log-failed`
events. The decision rule keeps its shape: with at least 100 boundaries,
the follow-up opens if the after rate of premature stops reaching the user
is at least half the corrected baseline; `cap` events and heuristic allows
that the transcript measure scores as premature are listed beside it as the
hook's misses. The window is attributed by the plugin-install reflog as
before.
```

The corrected baseline is Correction 8 in
`../2026-10-19-sdd-turn-liveness/README.md`: 14 sessions, 1434 task
boundaries, 296 premature stops, 20.64 per 100 boundaries, 21 of them followed
by a resume message, and 2211 live-work turn ends, as
`../2026-10-19-sdd-turn-liveness/field/baseline.txt` records them. The numbers
it supersedes (1495 boundaries, 301 premature stops, 20.13 per 100, 2228
live-work turn ends) are kept beside it there. Half of 20.64 per 100 is the
threshold the rule names.

The two after-window measures are
`../2026-10-19-sdd-turn-liveness/field.py` for the transcript and
`../2026-10-19-sdd-turn-liveness/field_hook.py` for the hook's own record, run
as `python3 field_hook.py --since <window start> --until <window end>` over
the same cohort, each session taken from its first in-window SDD invocation as
Correction 8 bounds the transcript measure. The field result is appended to
the hyperpowers evidence note and never holds or reverts the release by
itself. This campaign's decision uses neither module.

## Config

The campaign pin, one value per key in `manifest.tsv`:

| Key | Value |
|---|---|
| `harness` | `33523dad56fc6d36f532ef4db52de065fc59ae20` |
| `treatment` | `4a4f354cdb414859235c2a58a4ebeeaa273ee11a` |
| `treatment_root` | `/Users/johnss51/.cache/hyperpowers/sdd-stop-guard/hp-treatment` |
| `model` | `claude-opus-5-5` |
| `cc` | `2.1.302` |
| `cc_path` | `/Users/johnss51/.local/bin/claude` |
| `provider` | `vertex` |
| `subagent_models` | `claude-opus-5-5,claude-sonnet-5-5,claude-haiku-4-5-20251001` |
| `codex` | `absent` |
| `task_tools` | `on` |

Codex absence is affirmative: the scenario's two pre-checks pass and no
main-session command invokes the companion.

The manifest's launch rows are the smoke (`smoke sdd-turn-liveness 1 p1
default`), T1 (`t1 sdd-turn-liveness-fork 1 p1 default`) and the ten counted
runs (`treatment sdd-turn-liveness 1 p1 default` through `p10`). Only the
`treatment` rows are the campaign: `tally.read_rows` reads those and no
others, and `measure-launch.sh` refuses an arm paired with the scenario it
does not run.

Each arm launches from the evals worktree with
`ANTHROPIC_MODEL=claude-opus-5-5 CLAUDE_CODE_ENABLE_TODO_TOOLS=1` exported,
through a launch view holding the pin rows and only that arm's rows, detached
and outside the command sandbox. A view rather than the whole manifest,
because `measure-launch.sh` claims a row's log exclusively and refuses a row
whose log already exists, so a later arm's launch must not re-enter an earlier
arm's rows. The smoke and T1 run one row at a time; the ten counted runs run
at concurrency 5 (treatment shown):

```
awk -F '\t' 'NF == 2 || $1 == "treatment"' evidence/2026-10-23-sdd-stop-guard/manifest.tsv > evidence/2026-10-23-sdd-stop-guard/manifest-treatment.tsv

nohup bash evidence/2026-10-23-sdd-stop-guard/launch-all.sh evidence/2026-10-23-sdd-stop-guard/manifest-treatment.tsv 5 > evidence/2026-10-23-sdd-stop-guard/logs/campaign-treatment.out 2>&1 &
```

`launch-all.sh` validates every row before it starts anything and runs each
row through `logs/measure-launch.sh`, which re-checks the pin and refuses a
launch that does not match. The operator's shell has to carry
`ANTHROPIC_MODEL`, `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` and the proxy variables:
the launcher refuses the launch without them. The agent's own task-tools
opt-in comes from the scenario's `# claude-env:` directive, and the tally
compares the pin against the value measured in the transcript, so the decision
does not rest on the operator's shell. Every launch exports
`DISABLE_AUTOUPDATER=1`.

Runs reach the tally only through the archive. `bash archive-runs.sh <arm>
<task-dir>` copies every run the arm's logs name out of `results/`, strips the
reinstallable paths, keeps `home/.cache/hyperpowers` whole (the receipts, the
mirrors, the plan workspaces and any state checkout are this campaign's
evidence) and post-checks each copy. The post-check reads whether the run
reached Finish from the run's own transcript, either the helper's
`status=finished ... receipt=` line in a Bash result whatever command printed
it, or a Bash call that runs `sdd-state finish` whatever it printed, and then
requires the receipt and the session mirror in the copy. The transcript is
read rather than the artifacts because the artifacts are what the check exists
to find missing. A run whose session called Finish against a stale workspace,
which the helper answers `status=none`, and which kept no receipt, fails that
check; it is an instrument failure to investigate, not a lost run. The archive
must not run while the analyzer is being edited, because the post-check
imports `analyze.py`.

`tally.py` and the per-run analyzer run from their own directory in the evals
worktree, over the archive and nothing else:

```
cd /Users/johnss51/Development/agents/hyperpowers/evals/.worktrees/sdd-stop-guard/evidence/2026-10-23-sdd-stop-guard && python3 tally.py
```

## Benchmark

`tests/hooks/test-sdd-stop-guard.sh` prints four benchmark lines when
`STOP_GUARD_BENCH` is set, all over a fixture of 50 candidate ledgers. The
controller's covering runs of the committed suite printed
`# bench no-plan cold 25 ms`, `# bench no-plan 14 ms`,
`# bench no-plan process 120 ms` and `# bench with-plan 24 ms`. Task 9's runs
on the same host under load averages 11 to 13 printed cold 163 to 254 ms, warm
15 to 19 ms and with-plan 21 to 43 ms, and its wider sampling put the cold
call anywhere from 24 to 430 ms, the process line at 112 to 371 ms and the
with-plan decision at 26 to 265 ms.

Each line answers a different claim.

- `# bench no-plan` is the decision itself, the warm median of five calls
  after the first. It is what the spec's 100 ms bound is about, and it is met:
  14 ms on the covering run, 15 to 19 ms under load.
- `# bench no-plan process` is what a Stop pays end to end, the real wrapper
  spawned once with the no-plan payload on stdin, node start-up and module
  import included: 120 ms on the covering run, 112 to 371 ms under load.
- `# bench no-plan cold` is the first call's cost in a fresh process, the
  first `cloneKey` git spawn, the JIT and the first touch of the fifty
  ledgers. It is the widest and the most load-sensitive reading, and it is
  bounded loosely at 1 s rather than by the spec's number.
- `# bench with-plan` is the decision that reads a turn from a 300 MB
  transcript, bounded at 1 s: 24 ms on the covering run, 21 to 43 ms on the
  committed-suite rounds and 26 to 265 ms across Task 9's wider sampling.

## Known limits of the instrument

- The hook reads the newest 200 decision lines of each log for its refusal
  count, after filtering to the session. A session that made more decisions
  than that on one plan has its oldest ones outside the count, so a cap that
  rests on them is not enforced.
- The hook reads the newest 64 receipts when it looks for a finished plan, and
  more than 64 candidate ledgers are `ambiguous` before any is read. A receipt
  older than the newest 64 is invisible to it. A receipt the session itself
  wrote at Finish is by construction among them.
- The wrapper's `hook-error` line is stamped by `date -u`, to the whole
  second, and those lines are mirror-only. Two of them in one second meet as
  one key in the union above: identical, they are one decision; different,
  they void the run. That is a recorded residual of the design.
- The long-soak measures read a shape, so several real spellings read as not
  proven. A soak or a watch reached through `||`, through a pipe, through a
  backgrounded command or through a command substitution is not proven; nor is
  a watch wrapped in `bash -c "tracked-job wait ..."`, run by `zsh`, or
  followed by a redirection or a note that prints after the helper's verdict.
  Each of those is a false negative the rule accepts to keep a forged proof
  out. The campaign's own fixture and the skill text produce none of them: the
  skill tells the controller to launch the soak through `tracked-job` and
  watch it in the foreground, which is the shape the measure reads.
- The untracked-launch tripwire reads commands and the files the session
  created or modified. Detachment through a spelling outside its list, or
  through a script that already existed in the repository (the fixture has
  none), would not be seen by it.
- A batched question answered with AskUserQuestion inside its turn writes no
  decision, so H2's adjudication half and H3 get live cases only from turn
  ends a run takes mid-plan (Correction 9).
- Messages typed during a foreground subagent are delayed until it returns, so
  the Gauntlet's own driving is slower in this scenario than in a backgrounded
  one. The spec's own "Known limits" list the guard's limits, as against the
  instrument's.

## Smoke

The record is `smoke.md`. Every run is archived under
`task-19-runs/smoke/`, the voided attempt included.

- `p1` (`sdd-turn-liveness-claude-auto-20261028T000444Z-7ffc`) was launched
  inside the command sandbox. It is a `void-setup` attempt: quorum's
  `git init -b main` stopped on "Operation not permitted".
- `r1` (`sdd-turn-liveness-claude-auto-20261028T000525Z-3ccc`) ran outside
  the sandbox and is the smoke of record. The Gauntlet passed it, and so did
  all nine post-checks.
- Read with the analyzer after Correction 9, it has `h1` true. Its record
  holds two decisions, both `no-ledger` allows after Finish's result, so
  `plan_decisions` is 0. It lists three stops, two of them in-turn, with none
  unmatched and no `neither`. It has no block and no adjudicated allow. It
  dispatched 15 of 15 in the foreground, with `short_ok` and `long_ok` true,
  no untracked launch, no live-shell turn end and `success` true.
- On its own (one run, R not applicable), it passes H1 to H4.
- The pinned analyzer misread this run, which led to Correction 9.

## T1

The record is in `smoke.md`, "T1". Every run is archived under
`task-19-runs/t1/`. No H criterion is applied to T1.

- `p1` (`sdd-turn-liveness-fork-claude-auto-20261028T010556Z-f352`) was
  launched inside the sandbox and is `void-setup` with the same signature.
- `r1` (`sdd-turn-liveness-fork-claude-auto-20261028T010948Z-93d7`) ran
  outside it with fork mode on, and the Gauntlet passed it.
- All 13 SDD dispatches ran in the background, and the transcript records a
  completion for every one, matched by tool-use id. The hook log holds 12
  `live-agent` allows. Each names the tool-use id of a background agent that
  was live at the allow and whose completion is recorded. It also holds two
  `no-ledger` allows after Finish, and no block.
- One STOP entry was untimed. It quotes the narration (a `thinking` block)
  Claude Code showed before the pre-flight AskUserQuestion call, not the
  question itself. In a counted run that entry would have made the run
  `void-instrument`; under Correction 10 it is that call's in-turn stop.

## Corrections

The numbering continues the series in
`../2026-10-19-sdd-turn-liveness/README.md`, where entries 1 to 8 live.

9. 2026-10-28, after the smoke and the launch of the counted runs, before any
   counted run was archived or tallied. Three analyzer changes in one commit.
   `analyze.STOP_LINE` takes either straight quote as an entry's delimiters,
   its text running to the closing delimiter the label follows, so an
   apostrophe inside a single-quoted entry does not end it. In-turn stops:
   `analyze.ask_user_questions` reads each question of the AskUserQuestion
   calls answered inside their turn, and `analyze.stop_times` times each
   listed stop by the earliest turn end or answered question after the
   previous match that quotes it, a turn end winning a tie; each question of
   an answered call can answer one listed entry, a quote that runs from one
   question into the next matches neither, and a hit is an in-turn stop,
   listed in `in_turn_stops` and kept out of `match_allows`, so it is never in
   `unmatched_stops`, while a dismissed or failed call leaves its question to
   the turn end. `liveness.ask_answered` reads a result as an answer when it
   is not an error and opens with `Your questions have been answered` or
   `The user answered:`, because `liveness.turn_ends` knew only the first,
   which Claude Code 2.1.302 no longer writes, and so carried every answered
   question into its turn end's text as if dismissed. H1 is restated per hook
   run under the plan: `analyze._decision_measures` reports `decisions_total`,
   `ledger_started`, `receipt_published`, `receipt_staged`, `h1_bound` and
   `off_plan_lines`; `h1` holds when the record has a line, the ledger's start
   is known and no line from that start until the transcript's record of
   Finish's result (`analyze.finish_record`) is off the plan, a run with a
   receipt and no such record fails closed, `h1_detail` names the part that
   failed, `plan_decisions` stays reported, and `tally.decide` requires `h1`
   of every counted run (`runs_h1`). That record comes after the ledger's
   removal, because the hook is registered for `Stop` alone and so cannot run
   inside a tool call, and `sdd-state finish` prints its `status=finished`
   line only after it has removed the ledger and published the receipt; the
   stamp in the receipt's name is taken when Finish stages the receipt, before
   the removal, so it is reported as `receipt_staged` and bounds nothing.
   Reason: the smoke run
   (`sdd-turn-liveness-claude-auto-20261028T000525Z-3ccc`) passed with three
   listed stops in single quotes, which `stop_lines` read as none. Two of them
   were AskUserQuestion calls answered inside the turn, which Zed's adapter
   also renders inside the turn, so no Stop hook ran for them; the hook ran
   twice, both times after Finish removed the ledger and so `no-ledger`, and
   the pinned rules read `plan_decisions = 0`. Once the quotes parsed, the
   stale answer prefix carried the first question into the first turn end's
   text, so the pinned rules timed the first stop there and left the
   `--window` question and `Which option?` untimed. The pre-flight question
   does not guarantee a plan line before Finish in this harness. The plan-line
   window opens at the ledger's start, not the session's, because a hook run
   before the ledger exists is correctly `no-ledger`. Two readings were
   refined the same day after review, before any counted run was archived or
   tallied, and this entry and its pins were amended in place: with one
   candidate per call, a grader that listed both questions of a two-question
   call as two entries would have left the second untimed and voided the run,
   and with the window closed at the receipt's staging stamp, a hook fault
   between staging and the ledger's removal would have escaped
   `off_plan_lines`. Read with the corrected analyzer, the smoke lists three
   stops, two of them in-turn, none unmatched, with `h1` true and no void; its
   window closes at Finish's result, recorded at 00:42:34.151Z, against a
   staging stamp of 00:42:32Z. Pins after the Correction: `liveness.py`
   `4b56247ca0333aac395f7807b051a92a3dae10e5`, `analyze.py`
   `ef04d776be3bfa18e604a5d0d3bcf14af44c0651`, `tally.py`
   `3457937ea55acb2135154e822b1c12f5b60ed47e`.
10. 2026-10-28, after the counted runs were archived and read with the
    Correction 9 analyzer, before any tally. One change to `analyze.py`, in
    two parts. Lead-ins: `analyze.ask_user_questions` gives each
    AskUserQuestion call answered inside its turn (by `liveness.ask_answered`,
    as before) one candidate before its questions, timed by the call: its
    displayed lead-in, the normalized join of every text block and every
    non-empty thinking block in the assistant records after the last tool
    result or user record before the call, up to and including the call's own
    record. A call's candidates are therefore its lead-in and then its
    questions in order. The lead-in is a fallback: `analyze.stop_times`
    consults it only when no turn end and no question from the cursor on
    quotes the entry. A lead-in precedes every turn end of its own turn and of
    the turns after it, so a lead-in must never take an entry a turn end or a
    question also quotes, because that could hide a missing allow. When a
    lead-in is used, entry 9's rule for using candidates is unchanged: an
    entry that takes one uses it and every earlier candidate, so an entry that
    takes the lead-in leaves the call's questions and the turn ends at or after
    the call available. An unanswered call still contributes nothing, and
    turn-end selection and the tie rule are unchanged. Rendering:
    `analyze._as_shown` drops backticks and `**`, which the terminal does not
    show, from a quote and from the text it is looked for in, and keeps
    underscores and single asterisks, which identifiers and globs carry;
    `analyze.stop_times` compares the two that way, while `analyze.normalize`,
    and so every listed and printed quote, is unchanged. Reason: read with the
    Correction 9 analyzer, six of the ten counted runs and T1 had listed
    entries that quote the displayed lead-in of an answered AskUserQuestion
    call, from a thinking block Claude Code 2.1.302 shows as narration or from
    a text block, or quote it without its markdown backticks. That analyzer
    left those entries untimed, so each of the six runs would have read
    `void-instrument` and been relaunched. The affected runs are `82f7`,
    `88ee`, `f445`, `de8b`, `cd9b` and `cc92` (three entries) among the counted
    runs, and `93d7` (T1). The change moves only stop timing, and therefore
    only the void classification: no H criterion's computation reads stop
    timing. Read with the corrected analyzer, the ten counted runs, T1 and the
    smoke have no unmatched stop; the nine entries that were untimed are
    in-turn stops timed by their calls, and no other entry or measure moved.
    The fallback was added the same day after review, before any tally, and
    this entry and its pin were amended in place: as first written, the
    lead-in competed with the turn ends, so a stock sentence in one call's
    narration (cd9b's lead-in ends "Full details are in the ledger", the entry
    its grader listed) would have taken a later turn's hand-back that repeated
    it. The fallback leaves every
    reading above unchanged, because no turn end or question quotes any of the
    nine entries. Pins after the Correction: `analyze.py`
    `6dd98e4b407e003c821360e02e2531c15efd004f`; `liveness.py`
    `4b56247ca0333aac395f7807b051a92a3dae10e5` and `tally.py`
    `3457937ea55acb2135154e822b1c12f5b60ed47e` are unchanged.

## Results

Recorded by Task 20 on 2026-10-28, from the archive under
`task-20-runs/treatment/`, with the analyzers at the pins entry 10 records
(`liveness.py` `4b56247c`, `analyze.py` `6dd98e4b`, `tally.py` `3457937e`).

The campaign passes its rule. `tally.py` reads ten counted runs and prints
`decision: PASS`, with H1, H2, H3, H4 and R true. The same ten runs never put
the guard to a decision under a plan. Each session ran its plan from the first
prompt to Finish's result inside one turn, so both of its turn ends came after
Finish had removed the ledger, and the hook's record in every run is two
`no-ledger` allows. `plan_decisions` is 0 in all ten runs. The refusal paths
(`open-tasks`, `live-shell`), the hand-back allows, the cap, `live-agent` and
`log-failed` did not run in any counted run, and H2's adjudication half and H3
hold with no cases.

Correction 10 was made after these runs were archived and read with the
Correction 9 analyzer: six of the ten (`82f7`, `88ee`, `f445`, `de8b`, `cd9b`
and `cc92`) had listed entries quoting the displayed lead-in of an answered
AskUserQuestion call, which that analyzer left untimed and so read as
`void-instrument`, and the Correction moves only stop timing and so only the
void classification (Corrections, entry 10).

### Launches

The controller launched the arm from this directory. The first try ran `p1`
inside the command sandbox from the one-row view `manifest-treatment-p1.tsv`,
and quorum's setup stopped on the known signature, `git init -b main` refused
the copy of the git template's `commit-msg.sample` with "Operation not
permitted" (`logs/treatment-sdd-turn-liveness-p1.log`). That attempt is
`void-setup`, uncapped. The replacement row `treatment sdd-turn-liveness 1 r1
default` was appended to `manifest.tsv` and `manifest-treatment.tsv`, and
`launch-all.sh manifest-treatment.tsv 5` ran outside the sandbox. The launcher
refused `p1` because its log existed, then ran `p2` to `p10` and `r1`.
`logs/campaign-treatment.out` closes with `all launches finished; launchers
non-zero: 1; manifest rows without a DONE log: 0`, and the one non-zero
launcher is that refusal. Every launch log reads the treatment root at
`4a4f354`, clean, before and after its run, with Claude Code 2.1.302 both
times.

| Row | Run id | Sandbox | Started | Finished | Closing | Tally |
|---|---|---|---|---|---|---|
| p1 | `sdd-turn-liveness-claude-auto-20261028T013913Z-1716` | inside | 01:39:13Z | 01:39:14Z | `DONE 2` | void-setup |
| p2 | `sdd-turn-liveness-claude-auto-20261028T014044Z-340f` | outside | 01:40:44Z | 02:37:41Z | `DONE 0` | counted |
| p3 | `sdd-turn-liveness-claude-auto-20261028T014044Z-82f7` | outside | 01:40:44Z | 02:31:32Z | `DONE 0` | counted |
| p4 | `sdd-turn-liveness-claude-auto-20261028T014044Z-81fb` | outside | 01:40:44Z | 02:35:16Z | `DONE 0` | counted |
| p5 | `sdd-turn-liveness-claude-auto-20261028T014044Z-f445` | outside | 01:40:44Z | 02:36:08Z | `DONE 0` | counted |
| p6 | `sdd-turn-liveness-claude-auto-20261028T014044Z-88ee` | outside | 01:40:44Z | 02:40:19Z | `DONE 0` | counted |
| p7 | `sdd-turn-liveness-claude-auto-20261028T023136Z-3425` | outside | 02:31:35Z | 03:26:46Z | `DONE 0` | counted |
| p8 | `sdd-turn-liveness-claude-auto-20261028T023520Z-de8b` | outside | 02:35:20Z | 03:31:47Z | `DONE 0` | counted |
| p9 | `sdd-turn-liveness-claude-auto-20261028T023621Z-cd9b` | outside | 02:36:21Z | 03:31:38Z | `DONE 0` | counted |
| p10 | `sdd-turn-liveness-claude-auto-20261028T023755Z-cc92` | outside | 02:37:52Z | 03:42:46Z | `DONE 0` | counted |
| r1 | `sdd-turn-liveness-claude-auto-20261028T024023Z-e136` | outside | 02:40:22Z | 03:33:59Z | `DONE 0` | counted |

The ten counted runs have quorum's final status `pass` and the Gauntlet's
status `pass`. No capped void occurred.

### Archive

The controller ran `bash archive-runs.sh treatment task-20-runs` from this
directory outside the sandbox, because inside it the script's copies of
`.git/config` and the plugins' `.mcp.json` files are refused. It exited 0,
archived all eleven attempts, the `p1` void included, and printed:

```
post-check treatment sdd-turn-liveness-claude-auto-20261028T013913Z-1716: finish=no receipt_published=na receipts=0 mirrors=0 ledger_last_task=no
post-check treatment sdd-turn-liveness-claude-auto-20261028T023755Z-cc92: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261028T014044Z-340f: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261028T014044Z-82f7: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261028T014044Z-81fb: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261028T014044Z-f445: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261028T014044Z-88ee: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261028T023136Z-3425: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261028T023520Z-de8b: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261028T023621Z-cd9b: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261028T024023Z-e136: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
```

Every counted run reached Finish, published one receipt, kept its session
mirror and recorded the last task's mark. The void wrote none of them.

### The ten runs

Each run was read with `python3 analyze.py task-20-runs/treatment/<run>`.
Every counted run reads `void` none, `final` pass, no decision conflict, `h1`
true with `h1_bound` `finish-result` and `off_plan_lines` 0, and provenance
matching the pin: `cc` 2.1.302, `model` claude-opus-5-5, recorded models
inside the allowed set, the plugin directory the treatment root, Codex absent,
the task tools on, and `evals_commit` `9cbc8b0` (harness paths identical to
the pin) with a clean tree. The tally prints no problem for any row.

The decision record and the STOP list:

| Row | Run | `decisions_total` | `plan_decisions` | `no-ledger` allows | Blocks | Listed stops | In-turn | Unmatched | `neither` |
|---|---|---|---|---|---|---|---|---|---|
| p2 | `340f` | 2 | 0 | 2 | 0 | 3 | 2 | 0 | 0 |
| p3 | `82f7` | 2 | 0 | 2 | 0 | 2 | 1 | 0 | 0 |
| p4 | `81fb` | 2 | 0 | 2 | 0 | 1 | 0 | 0 | 0 |
| p5 | `f445` | 2 | 0 | 2 | 0 | 3 | 2 | 0 | 0 |
| p6 | `88ee` | 2 | 0 | 2 | 0 | 2 | 1 | 0 | 0 |
| p7 | `3425` | 2 | 0 | 2 | 0 | 1 | 0 | 0 | 0 |
| p8 | `de8b` | 2 | 0 | 2 | 0 | 3 | 2 | 0 | 0 |
| p9 | `cd9b` | 2 | 0 | 2 | 0 | 2 | 1 | 0 | 0 |
| p10 | `cc92` | 2 | 0 | 2 | 0 | 4 | 3 | 0 | 0 |
| r1 | `e136` | 2 | 0 | 2 | 0 | 1 | 0 | 0 | 0 |
| Total | | 20 | 0 | 20 | 0 | 22 | 12 | 0 | 0 |

The mechanism measures (seconds from each call or launch to its result or
exit):

| Row | Run | Foreground dispatches | Background | Unclassified | Untracked | Short soak s | `short_ok` | Long job s | `long_ok` | Live-shell turn ends | `success` |
|---|---|---|---|---|---|---|---|---|---|---|---|
| p2 | `340f` | 13 | 0 | 0 | 0 | 241.8 | true | 721.4 | true | 0 | true |
| p3 | `82f7` | 13 | 0 | 0 | 0 | 1.8, 241.8 | false | 721.0 | true | 0 | true |
| p4 | `81fb` | 13 | 0 | 0 | 0 | 240.4 | true | 721.3 | true | 0 | true |
| p5 | `f445` | 13 | 0 | 0 | 0 | 243.0 | true | 721.1 | true | 0 | true |
| p6 | `88ee` | 13 | 0 | 0 | 0 | 241.2 | true | 721.3 | true | 0 | true |
| p7 | `3425` | 15 | 0 | 0 | 0 | 241.6 | true | 721.6 | true | 0 | true |
| p8 | `de8b` | 13 | 0 | 0 | 0 | 240.5 | true | 721.6 | true | 0 | true |
| p9 | `cd9b` | 13 | 0 | 0 | 0 | 241.1 | true | 721.7 | true | 0 | true |
| p10 | `cc92` | 13 | 0 | 0 | 0 | 241.2 | true | 721.8 | true | 0 | true |
| r1 | `e136` | 13 | 0 | 0 | 0 | 241.9 | true | 722.1 | true | 0 | true |

Every counted run has exactly two turn ends, and both come after Finish's
result. The first is the finishing menu, which ends "Which option?"; the
second is the session's last report, after the merge. The hook answered each
of the twenty with a `no-ledger` allow 0.14 to 0.94 s after the turn end; the
first allow of a run came 15.2 to 22.9 s after Finish's result, the second
123.6 to 183.2 s after it. The hook's own `elapsed_ms` on those twenty
decisions runs from 25 to 264. Both lines of each run are in the session
mirror alone: no receipt holds a `stop-guard.jsonl`, because the hook writes
the plan's own log only when it finds the plan's workspace, and it never ran
while one existed. No turn end fell between a run's `ledger_started` and its
`receipt_published`, so there was no turn end at which the hook could have
judged the plan.

The Gauntlet listed 22 STOP entries across the ten runs, every one labelled
`question`. Ten are turn ends, the finishing menu once per run, each matched
to that run's first `no-ledger` allow. Twelve are in-turn stops, timed by
AskUserQuestion calls answered inside their turn: eleven are pre-flight
questions before Task 1 in seven runs, and one is `cc92`'s question at
03:20:14Z, after its final review and with its ledger live, whether the final
fix pass should depart from the plan's verbatim CLI code to correct a drift in
`simulate`'s default window, answered inside the turn at 03:21:57Z ("implement
the plan exactly as written"). It is the only question any counted run asked
after Task 1 began, and no Stop hook ran for it. Every counted run asked the
fixture's `DEFAULT_WINDOW_SECONDS` question with AskUserQuestion before Task 1
and had it answered inside the turn. In `81fb`, `3425` and `e136` the
Gauntlet listed only the finishing menu, although each of those sessions also
asked its pre-flight questions that way.

`82f7` is the one run whose `short_ok` is false. Its first main-session call
that names the short soak returned after 1.76 s, because it redirected the
soak's output into a `reports/` directory that did not exist yet: the shell
refused the redirection, so the soak never started. Six seconds after that
call the session created the directory and ran the soak in a foreground call
(timeout 420000 ms) that returned after 241.8 s. The rule counts every
main-session execution, so the run reads as not handling the short command as
the rule says, and F is 9 of 10. The rule was applied as written.

### Adjudication

No counted run holds a `block`, an allow whose reason is `handback-text`,
`handback-line` or `cap`, or a `log-failed` allow. The only decisions are
post-Finish `no-ledger` allows, which owe none. `adjudications.tsv` gains no
row, no agent message was read for a label, and `false_handbacks`,
`false_blocks`, `unadjudicated_allows` and `unadjudicated_blocks` are 0 in
every run because there was nothing to count.

### Tally

`python3 tally.py` from this directory wrote `tally.txt`. Its decision lines:

```
runs_h1: 10
runs_with_plan_decisions: 0
H1: True
neither_listed_total: 0
false_handbacks_total: 0
unadjudicated_allows_total: 0
H2: True
false_blocks_total: 0
unadjudicated_blocks_total: 0
H3: True
foreground_share: 1.0
untracked_total: 0
f_runs: 9
live_shell_turn_ends_total: 0
H4: True
success_runs: 10
R: True
decision: PASS
```

| Criterion | Threshold | Reading | Holds |
|---|---|---|---|
| H1 (Correction 9): no off-plan hook line in the plan window | `h1` in every counted run | `plan_decisions` 0 in 10 of 10; no hook line fell in any run's plan window; `h1` 10 of 10 | yes, with no decision under a plan |
| H2 | `neither_listed` 0; false hand-backs 0; unadjudicated allows 0 | 0 of 22 listed; 0; 0, with no allow owing a label | yes, its adjudication half with no cases |
| H3 | false blocks 0; unadjudicated blocks 0 | 0; 0, with no block | yes, with no cases |
| H4 | foreground share at least 0.9; untracked 0; F at least 9 of 10; live-shell turn ends 0 | 1.0 (132 of 132); 0; 9; 0 | yes |
| R | at least 7 successful runs | 10 | yes |

### What the counted runs show and do not show

Under Correction 9, a PASS means that no stop reached the human partner as a
`neither` stop on the Gauntlet's list and that the mechanism criteria held.
Both are what these runs show. All 132 SDD dispatches ran in the foreground,
no launch was untracked, every run watched the long soak through
`tracked-job wait` to `status=exited code=0`, nine of ten ran the short soak in
the foreground as the rule reads it, no turn ended with only a tracked shell
live, and all ten plans completed with a receipt, a final review and passing
tests. The hook ran at every one of the twenty turn ends, within a second of
each, its record holds no conflicting line, and its `no-ledger` answer after
Finish is the correct one.

The runs do not show the guard deciding anything about a plan. Its refusal of
a premature stop, its refusal while a tracked shell is live, its release of a
recorded hand-back, its cap and its fail-open path were not exercised live in
any counted run, so H2's adjudication half and H3 held with no cases and H1
holds because no line fell in its window at all. The absence of a premature
stop in these runs is a property of the sessions, each of which ran its plan
in one turn; it cannot be credited to the hook, which made no decision while a
plan's ledger existed. The uncounted T1 is the only run of this campaign in
which the hook judged a plan: 12 `live-agent` allows under fork mode (section
T1).

Read with H1 as the spec and the pre-registration first wrote it
(`plan_decisions >= 1`), every counted run fails H1 and the campaign is FAIL
on H1. Correction 9 restated H1 after the smoke and after these runs were
launched, before any of them was archived or tallied; this decision is read
under that restatement and under Correction 10.

### Limits

H2's first half is the Gauntlet's reading of each run. Its list omitted the
pre-flight questions in three runs that asked them, and in six runs it quoted
the lead-in Claude Code showed before an answered question, or quoted text
without the markdown the terminal hides, which is why Correction 10 exists.
Nothing on any list was labelled `neither`.

F is 9 of 10 on a shape reading of `82f7`, where the first call that names
the short soak never ran it. The threshold is met either way.

There is no control arm, so nothing here compares the guard against a
session without it. The scenario is short and fresh, and under its fixture
every legitimate hand-back was an AskUserQuestion call answered inside its
turn, which no Stop hook sees, as Correction 9 anticipated. The premature
stops the field baseline counts come from long, compacted sessions whose
turns end mid-plan; the field rule over the after-window is where the guard's
decisions under a plan will be read.
