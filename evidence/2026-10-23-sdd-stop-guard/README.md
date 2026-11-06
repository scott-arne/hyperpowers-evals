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
records its blob after it. Correction 11 changed `tally.py` alone, and entry 11
records its blob after it. Correction 12 changed `analyze.py` alone, and entry
12 records its blob after it.

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
   `3457937ea55acb2135154e822b1c12f5b60ed47e`. The human partner chose this
   correction on 2026-10-28, over a fixture rule forcing text hand-backs and
   over holding the campaign, knowing that the restated H1 holds vacuously
   when no hook line falls under a plan.
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
11. 2026-11-05, after the Z4 contingency's skill change, before any
    contingency run was launched. One change to `tally.py`: a `--logs` option
    names the directory the launch logs are read from, default `logs/`,
    resolved under this directory as `--archive` is. The contingency passes
    `--logs logs/z4`. Reason: the contingency's launch rows reuse the names
    `treatment sdd-turn-liveness 1 p1` to `p10`, and
    `logs/measure-launch.sh` refuses a launch whose log already exists, so the
    contingency launches with `LOGS` set to `logs/z4` and its logs go there.
    `tally.py` read `logs/` unconditionally, and its log pattern matches only
    the treatment arm's logs, so pointed at `manifest-z4.tsv` it would have
    taken Task 20's launch logs `p1` to `p10` as the contingency's own, named
    Task 20's `r1` log as a log without a manifest row, and returned no
    decision. No decision logic, void rule or
    count changed. Under the default, `python3 tally.py --out <file>` writes a
    file that `cmp` finds identical to `tally.txt`, byte for byte, verified by
    that command. Pins after the Correction: `tally.py`
    `23e39ffb4bf75b4d9e0ac5cb9d715ee9e0d65598`; `liveness.py`
    `4b56247ca0333aac395f7807b051a92a3dae10e5` and `analyze.py`
    `6dd98e4b407e003c821360e02e2531c15efd004f` are unchanged.
12. 2026-11-05, after the Z4 contingency campaign was tallied (`tally-z4.txt`,
    FAIL) and before any run of the second re-measure was launched. One change
    to `analyze.py`, in three parts, each a call shape the F reader missed.
    Reason: H4 failed on F, 6 of 10 against a threshold of 9, and each of the
    five misses behind that is a foreground call the analyzer could not read.
    `13eb` and `0c06` ran the short soak as `time python3 -m unittest
    tests.test_soak_short -v 2>&1 | tail -5`, and `UNITTEST_CMD` admitted only
    environment assignments, `nohup` and `timeout` before the interpreter, so
    `runs_soak` found no execution. `13eb` and `560c` closed their last watch
    of the long soak with `tracked-job wait <jobdir> --max-ms <n>; date -u`,
    whose result is `status=exited code=0` followed by one date line, and
    `_waited_job` required the wait to be the final segment while
    `_wait_verdict` read only the last line. `6dcc` watched with
    `S=<scripts>; W=$($S/sdd-dir plan.md 2>/dev/null); $S/tracked-job wait
    $W/jobs/<job> --max-ms 300000`, whose last line is `status=exited code=0`,
    and `_proven_final` returned None for any text carrying `$(`. The human
    partner decided on 2026-11-05 to keep H2 as written, to correct the F
    reader before any new run, and to measure ten fresh runs at the same
    treatment ("Pre-registration addendum (Z4 contingency, second
    re-measure)").

    `UNITTEST_CMD` now also admits the shell keyword `time`, with or without
    `-p`, in the prefix group beside `nohup` and `timeout`. For every prefix,
    `time` or none, `runs_soak` counts a match only when it starts the text
    or the operator it starts after (`;`, `&`, `|`, `(` or a newline) lies
    outside quotes. Quotes are read as `_split_ops` reads them, so a
    backslash quotes the next character and an apostrophe in a comment opens
    no quote, and a heredoc body is read as blank, so an apostrophe there
    opens none either. A comment, a `#` outside quotes at the start of the
    text or after whitespace, `;`, `&`, `|` or `(`, running to the end of
    its line, is read as blank too, at every nesting level, so `sleep 250; #
    suggested; time python3 -m unittest tests.test_soak_short -v`, which
    runs only the sleep, counts as no soak, while a comment on the soak's
    line or on the line before it leaves the soak readable and `a#b` is a
    word. The untracked-launch tripwire reads a comment as blank the same
    way before it looks for a `&`, so `ls  # build & test` is no untracked
    launch and `sleep 1 & # note` still is.
    A heredoc's delimiter may be a word quoted with `'`
    or `"` (`<<'END-NOTE'`), a word after a backslash (`<<\EOF`), or a bare
    word (`<<END.NOTE`), each of which may hold characters beyond letters
    and digits, and its body ends at the first line that is the unquoted
    delimiter alone, after leading tabs under `<<-` only. The analyzer's other heredoc readers, the
    untracked-launch tripwire, the soak-tamper check and the watch reader,
    share that pattern. The `(` of a `$(` inside double quotes, and the body
    up to its closing `)`, are read unquoted, because bash runs that command.
    A backslash and a newline outside single quotes are a line continuation,
    read as two spaces, so `python3 -m unittest \` with
    `tests.test_soak_short -v` on the next line counts; inside single quotes
    bash keeps both characters, and so does the reader. A quoted module name
    (`python3 -m unittest "tests.test_soak_short"`) still counts, since the
    operator before it is outside the quotes. These count as no soak: a
    `time` that is an argument of another command (`echo time python3 -m
    unittest ...`) or that runs another program (`time echo ...`), and an
    interpreter after a quoted `;` or `(`, with `time` or without (`echo "x;
    time python3 -m unittest ..."`, `echo 'x (python3 -m unittest ...'`).

    `runs_soak` also reads the operand of a shell that a segment runs with
    `-c` as a command of its own, by the same rules, through up to four
    nested wrappers, under two conditions that hold at every nesting level.
    First, the segment's words, after assignments and the `env`, `nohup`,
    `time` and `timeout` prefixes, are `bash`, `sh` or `zsh` by basename
    followed directly by a bare `-c` and its operand; the words after the
    operand are `$0` and its arguments and do not matter. Any other option
    before or clustered with the `-c` (`-n`, which reads the operand and
    runs nothing, `-lc`, `-ec`, `-o pipefail`, `+o posix`, `--norc`, `--`)
    leaves the operand unread. That is the form the untracked-launch
    tripwire's `SH_C` recognizes, so a wrapper this reader credits is always
    one the tripwire can see into when something inside it is detached;
    `_shell_operand`, which reads the other option forms for the job reader
    and the proven final segment, is unchanged. Second, the shell reaches
    the segment and waits for it: every operator joining the segments
    before it is `;` or `&&` (the operator introducing the first segment is
    empty), with no `||` and no `|` among them, no `&` outside quotes
    detaches it, and when any `&&` stands before it, every segment before it
    passes the setup test the dated wait uses below (`cd` with one directory
    word not starting with `-`, or assignment words with no substitution),
    since a predecessor that can fail and print nothing would otherwise
    skip the wrapper unseen. The segments are the ones `_split_ops` finds
    outside quotes, comments and heredoc bodies. So `bash -c "cd /x &&
    python3 -m unittest tests.test_soak_short -v"`, `bash -c 'cd /x;
    python3 -m unittest tests.test_soak_short -v'`, `bash -c "python3 -m
    unittest tests.test_soak_short -v"` and `cd /x && bash -c "python3 -m
    unittest tests.test_soak_short -v"` count, which the quote rule alone
    would have refused for the first two and never counted for the others.
    These count as no run: a wrapper quoted in another command's argument
    (`echo "bash -c 'python3 -m unittest ...'"`), a wrapper whose operand
    cannot be read (the soak parked as `$0` after the operand, or an
    argument of a script), `sleep 250; true || bash -c "<soak>"`, `sleep
    250; false && bash -c "<soak>"`, `sleep 250; bash -n -c "<soak>"`, `bash
    -lc "<soak>"`, `bash -o pipefail -c "<soak>"`, a wrapper after a pipe,
    and a wrapper detached by `&` (`nohup bash -c "<soak>" &`, which the
    untracked-launch tripwire flags as it always did). The rest of the
    measure applies to the call as before, so a wrapped soak in a call
    launched in the background is a run that fails the rule that every run
    is a foreground one. The job reader quotes a job's argv back into shell
    form before this reader sees it, so an argument that carries an
    operator and the soak's words is no soak job, and the re-joined argv is
    one segment headed by the interpreter, in which this reader finds no
    wrapper: a job's own shell wrapper is read as before, through
    `_shell_operand`, so `bash -lc <soak>` is still a soak job and `nohup
    bash -c <soak>` is still none.

    `_waited_job` takes a count of trailing lines, 0 by default. At 1 the call
    must close with exactly one `date` segment: the call's final non-empty
    segment, joined to the wait by `;` or `&&`, whose words are `date` by
    basename followed by nothing, `-u`, `-R`, a single `+<format>` word, or
    `-u` and a single `+<format>` word. The date must print one non-blank
    line into the result. So the format holds a character that is not
    whitespace, expands nothing (no `$` and no backtick), redirects nothing
    (no `<` or `>`, which the lexer keeps inside a word such as
    `+%s>/dev/null`), and carries no newline, and each `%` in it is `%%` or
    a conversion by one letter other than `n`, `t`, `E` and `O`. That keeps
    out `%n` and `%t` in every spelling: on this host's `date` a flag or a
    modifier between the `%` and the `n` (`%-n`, `%En`) still prints a
    newline, and `%t` prints a tab, which is a blank line. The wait before
    the date must meet everything a final wait already had to: every
    operator joining it is in `PROVEN_OPS`, the shell waits for it, and it
    runs `tracked-job wait`. `_wait_verdict` takes the same count and reads
    the verdict from the last non-blank line before the result's final
    non-blank line, and `_watched` tries both counts, of which at most one
    fits a call's shape. Under `&&` the date runs only when the wait exited
    0, which the wait does only for `status=exited code=0`, so the call's
    exit 0 still vouches for the wait. Under `;` the call's exit is the
    date's, so the printed verdict is the whole proof, and two more
    conditions hold. The wait's segment carries no redirection but one whose
    target descriptor is explicitly 2: `2>&1`, `2>&-`, or `2>` or `2>>` to
    one plain file word, each a whole word outside quotes and after
    unquoted whitespace. The helper prints its verdict on stdout, so none of
    those can keep it out of the result, while any other `<` or `>` may send
    the answer elsewhere or close stdout under it, and stays refused: `>`,
    `1>`, `>&2`, `1>&2`, `&>`, `>&-`, `1<&-`, `<`, `0<`, a here-string, and
    `2>&1-`, which moves fd 1 onto fd 2 and closes fd 1. An escaped space
    before the `2` (`x\ 2>/dev/null`) makes `x 2` one word and `>/dev/null`
    a redirection of stdout, so that is refused too. And the wait must have
    run. Reached through `;` alone, it runs whatever came before it.
    Reached through `&&`, it is admitted only when
    every segment before it, whatever joins them, is setup: `cd` followed by
    exactly one directory word that does not start with `-`, its stderr
    redirected or not, or assignment words whose values hold no
    substitution, and neither shape may hold a parenthesis or a backtick.
    Neither shape can print a line that reads as a verdict, so when a failed
    `cd` skips the wait, the line before the date is `cd`'s own error or
    nothing at all. A substitution assignment is not setup there, though it
    may precede a wait reached through `;`: its body can fail and print
    anything, and under a `;` date that failure leaves no trace in the call's
    exit status. Every other trailing segment is read as before. These stay
    rejected: `<wait>; echo status=exited code=0`, `<wait>; date; echo
    status=exited code=0`, `<wait> | date`, `<wait> || date`, `<wait>; date
    -f <file>`, `<wait> & date`, a `<wait>; date -u` whose line before the
    date is `status=running`, `echo status=exited code=0; false && <wait>;
    date -u`, `echo status=exited code=0; cd /nowhere 2>/dev/null && <wait>;
    date -u`, `W=$(cmd) && <wait>; date -u`, `cd -- /x && <wait>; date -u`,
    `echo status=exited code=0; <wait> 1<&-; date -u`, the same with `1>&2`,
    `&>/dev/null`, `>&-` or `2>&1-` on the wait, and a closing `date +`,
    `date '+ '`, `date '+%t'` or `date +%s>/dev/null`. These are read:
    `<wait> 2>&1; date -u` and `<wait> 2>/dev/null; date -u`.

    `_proven_final` admits a command substitution when every `$(` in the text
    is the whole value of an assignment word, `NAME=$(...)` or
    `NAME="$(...)"`, each such word sits in a segment before the final one
    made of assignment words only, and the final segment carries no
    substitution. Each body holds no `;`, `&`, `|`, newline, backtick or `)`
    before its end, quoted or not. Outside quotes it also holds no `(`,
    backslash or `#`, and no `$` directly before a `'`, which would open
    bash's ANSI-C quote `$'...'`, inside which `\'` does not close the
    string. A single-quoted string in it holds no `'`, and a double-quoted
    one holds no `"`, backslash or `$(`. With no `)` inside a quoted string
    and no ANSI-C quote, bash and the reader end the body at the same `)`,
    and with nothing in it that `_split_ops` splits at, the body stays inside
    its assignment's segment, so no fragment of it can pose as the final
    command. So `W=$(dirname "$PWD")`, `W=$("$S/sdd-dir" plan.md
    2>/dev/null)` and `W="$($S/sdd-dir plan.md)"` before a wait leave it
    readable. Any backtick, and every other substitution, still leaves the
    text unproven.
    These stay rejected: `echo $(true; <wait>)`, `W=$(a; b); <wait>`,
    `X=$(cmd) other-cmd; <wait>`, a wait with `$(...)` in its own words, a
    `$(` in a comment, `W=$(echo "a)b"); <wait>`, `W=$(echo "x; y"); <wait>`,
    a body with a backslash or a `#` outside quotes, a body with an ANSI-C
    quote (among them `W=$(true $'\'); <wait> X'Y) && echo status=exited
    code=0 #'`, where bash runs no wait and only the echo), and any
    backtick. The function's other callers read a job's argv, which
    `shlex.join` quotes into one segment, so a `$(` there is always in the
    final segment and is still refused: a job running `bash -c 'W=$(pwd);
    python3 -m unittest tests.test_soak_long -v'` is no long soak, a false
    negative this accepts.

    H1 to H4, R and every other measure are unchanged, and the re-read proves
    it. Read with the corrected analyzer, every run in
    `task-20-runs/treatment/` (eleven attempts, the `p1` void among them) and
    in `task-21-runs/treatment/` (ten) prints the same JSON as at `6dd98e4b`
    except in four contingency runs. In `13eb`, `short_runs` gains its one
    foreground run of the short soak (240.6 s under a 420000 ms timeout), and
    `short_ok` and `long_ok` turn true. In `0c06`, `short_runs` gains its one
    run (243.2 s under 420000 ms) and `short_ok` turns true. In `560c` and
    `6dcc`, `long_ok` turns true. `long_job` moves in no run.
    The first campaign's tally, rerun with the corrected analyzer, is
    `tally.txt` byte for byte: `H1: True`, `H2: True`, `H3: True`, `H4: True`
    with `f_runs: 9`, `R: True`, `decision: PASS`. The contingency's reads
    `H1: True`, `H2: False` with `neither_listed_total: 1`, `H3: True`,
    `H4: True` with `f_runs: 10`, `R: True`, `decision: FAIL`. Those readings
    do not replace `tally.txt` or `tally-z4.txt`, which stay the records of
    their campaigns as read at their pins. Pins after the Correction:
    `analyze.py` `ae23acdc25b809c16ca1f0c3a91b6feb6b1fd428`; `liveness.py`
    `4b56247ca0333aac395f7807b051a92a3dae10e5` and `tally.py`
    `23e39ffb4bf75b4d9e0ac5cb9d715ee9e0d65598` are unchanged.

## Pre-registration addendum (Z4 contingency)

2026-11-05, before any contingency run was launched.

Release check Z4 failed in Zed. In both Zed runs (sessions `9558e8d7` and
`d15435c6`) the controller resumed its implementer with `SendMessage` for a
fix round. On Claude Code the resumed agent ran in the background, the stop
guard allowed the turn end as `live-agent`, and the turn the human partner's
prompt opened closed while the agent worked: for 4 min 12 s in the first run
and 19 s in the second, read from the transcripts' turn ends. The spec's
contingency therefore ships. On Claude Code, where the Agent tool offers
`run_in_background`, fix rounds 1 to 3 dispatch a fresh foreground
implementer on the original implementer's model. That change is hyperpowers
`fea1999..36a6255`, approved by its task review and by two Codex gate
rounds. The same range carries Task 21a's stop-guard fix, under which a
plain file in the cache reads as no ledger; it changes
`hooks/lib/stop-guard.mjs`.

The ten contingency runs differ from `manifest.tsv` in three pin rows and
nothing else:

- `treatment` `36a62559c2ba7ab6deb5a9b502a4938cfd7d4e39`.
- `treatment_root` `/Users/johnss51/.cache/hyperpowers/sdd-stop-guard/hp-treatment-z4`,
  a detached worktree at that commit that is never edited.
- `cc` `2.1.317`. Claude Code updated itself from 2.1.302 on 2026-11-03, and
  the human partner chose to measure the contingency on 2.1.317 rather than
  hold 2.1.302 through a campaign-local link. These runs therefore differ
  from the first campaign in the Claude Code version as well as the
  treatment, and a difference between the two tallies cannot be attributed
  to the treatment alone. `cc_path` is unchanged; it now resolves to 2.1.317.

The hook files at the new treatment, from `git rev-parse 36a6255:<f>` in
hyperpowers: `hooks/sdd-stop-guard` `a2467cbe83a448dfa52a901830258d0b7693fa4f`
(unchanged) and `hooks/lib/stop-guard.mjs`
`48f4d06b4d20b18df7226746b5ec711ffff4ede6`.

`manifest-z4.tsv` holds those pin rows and the ten launch rows
`treatment sdd-turn-liveness 1 p1 default` to `p10`. The rows reuse Task 20's
names, and `logs/measure-launch.sh` claims a row's log exclusively, so the
contingency logs to `logs/z4/` through `LOGS`, which `launch-all.sh`,
`logs/measure-launch.sh` and `archive-runs.sh` honor; the tally reads that
directory through `--logs` (Correction 11). The rows launch from two views,
`manifest-z4-a.tsv` (`p1` to `p5`) and `manifest-z4-b.tsv` (`p6` to `p10`),
each through `launch-all.sh <view> 5` as a tracked background job outside the
command sandbox, the second after the first has finished: Task 20's ten ran
in one wave at concurrency 5 for 2 h 02 min, longer than the 7200000 ms a
tracked background command may run. A replacement row is `r<n>`, appended to
`manifest-z4.tsv` and launched from a view of its own. A dry pin check at
evals `a876b6b1d` (`QUORUM_RUN_CMD=true`, `LOGS` in a scratch directory)
read the new root at `36a6255`, clean before and after, the harness paths
identical to the pin, Claude Code 2.1.317 and provider `vertex`.

H1 to H4 and R apply unchanged to the ten runs under `manifest-z4.tsv`, with
the void rules and the adjudication of "Pre-registration" and Corrections 9
to 11. The runs are archived with
`LOGS=logs/z4 bash archive-runs.sh treatment task-21-runs` and tallied with
`python3 tally.py --manifest manifest-z4.tsv --logs logs/z4 --archive task-21-runs/treatment --out tally-z4.txt`.
`tally-z4.txt` is the decision of record for the release; `tally.txt` stays
the first campaign's record.

## Pre-registration addendum (Z4 contingency, second re-measure)

2026-11-05, written before any run of this campaign was launched.

The Z4 contingency campaign failed its rule: `tally-z4.txt` reads
`decision: FAIL`, with H2 and H4 false ("Results (Z4 contingency)"). H2
failed on one entry: in `95e8` the Gauntlet labelled `neither` the session's
report after the merge, a turn end after Finish had removed the ledger, which
the hook answered `no-ledger`. H4 failed on F, 6 of 10 against a threshold of
9, and each of the five misses behind that is a foreground call whose shape
the analyzer could not read. The human partner decided on 2026-11-05 to keep
H2 as written, to correct the F reader before any new run, and to measure ten
fresh runs at the same treatment.

Correction 12 is that correction. It changes `analyze.py` alone: the soak
reader takes a `time` prefix, and the watch reader takes a closing `date`
after the wait and a substitution assigned before it. No other measure moves.
Read with it, the contingency's F is 10 of 10 and its decision is still FAIL,
on H2; that reading does not replace `tally-z4.txt`. Re-running the first
addendum's recipe with the current analyzer writes this reading over the
committed `tally-z4.txt`, so a reproduction gives `--out` a scratch path, for
example under `$TMPDIR`, and compares the result with the committed file.

The treatment is the first addendum's, unchanged: hyperpowers
`36a62559c2ba7ab6deb5a9b502a4938cfd7d4e39` at the root
`/Users/johnss51/.cache/hyperpowers/sdd-stop-guard/hp-treatment-z4`, a
detached worktree at that commit that is never edited, on Claude Code
2.1.317. The hook files are the ones the first addendum records.

`manifest-z4b.tsv` holds the pin rows of `manifest-z4.tsv`, byte for byte,
and the ten launch rows `treatment sdd-turn-liveness 1 p1 default` to `p10`,
so its bytes are `manifest-z4.tsv`'s. The rows launch from two views,
`manifest-z4b-a.tsv` (`p1` to `p5`) and `manifest-z4b-b.tsv` (`p6` to
`p10`), each through `launch-all.sh <view> 5` as a tracked background job
outside the command sandbox, the second after the first has finished, with
`LOGS` pointing at `logs/z4b/`. The rows reuse the names of the earlier
campaigns' rows, and `logs/measure-launch.sh` claims a row's log
exclusively, so this campaign's logs go to a directory of their own. A
replacement row is `r<n>`, appended to `manifest-z4b.tsv` and launched from
a view of its own.

The runs are archived with
`LOGS=logs/z4b bash archive-runs.sh treatment task-21-runs/z4b` and tallied
with
`python3 tally.py --manifest manifest-z4b.tsv --logs logs/z4b --archive task-21-runs/z4b/treatment --out tally-z4b.txt`.

H1 to H4 and R apply unchanged to the ten runs under `manifest-z4b.tsv`, with
the void rules and the adjudication of "Pre-registration" and Corrections 9
to 12. `tally-z4b.txt` is the decision of record for the release;
`tally.txt` and `tally-z4.txt` stay the records of the first campaign and the
Z4 contingency campaign.

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

## Results (Z4 contingency)

Recorded by Task 21 on 2026-11-05, from the archive under
`task-21-runs/treatment/`, with the analyzers at the pins entry 11 records
(`liveness.py` `4b56247c`, `analyze.py` `6dd98e4b`, `tally.py` `23e39ffb`).
The ten runs are the ones "Pre-registration addendum (Z4 contingency)"
registered: treatment `36a6255`, root `hp-treatment-z4`, Claude Code
2.1.317, under `manifest-z4.tsv`.

The contingency fails its rule. `tally.py` reads ten counted runs and prints
`decision: FAIL`, with H2 and H4 false and H1, H3 and R true. H2 fails on one
entry: in `95e8` the Gauntlet labelled `neither` the session's report after
the merge, a turn end 157.2 s after Finish's result, when the ledger was gone
and the hook answered `no-ledger`. The driver listed it because the session
never said that `sdd-state finish` had published its receipt, which the
scenario's done condition asks the agent to report. H4 fails on F, 6 of 10
against a threshold of 9. The four runs that miss F hold five readings, and
each is a reading of a command's shape: two short soaks run with a `time`
prefix, which the soak reader does not take for an execution, two closing
watches followed by `; date -u`, and one watch reached through a command
substitution. Read by eye, each of those five calls did what the rule asks
(The ten runs, below). The rule was applied as written.

As in the first campaign, the guard made no decision under a plan.
`plan_decisions` is 0 in all ten runs, and the hook's whole record is 21
`no-ledger` allows, all after Finish's result. The contingency's own change
was not exercised either: no task in any run needed a fix round, so no run
dispatched a fix-round implementer of either kind, and no run called
`SendMessage`.

The first campaign's tally (`tally.txt`) is PASS at treatment `4a4f354` on
Claude Code 2.1.302; this one is FAIL at treatment `36a6255` on Claude Code
2.1.317. The two sets of runs differ in the Claude Code version as well as the
treatment, so no difference between the tallies can be attributed to the
treatment alone.

### Launches

The controller launched the ten rows from the evals worktree, outside the
command sandbox, with `LOGS` set to this directory's `logs/z4`:
`ANTHROPIC_MODEL=claude-opus-5-5 CLAUDE_CODE_ENABLE_TODO_TOOLS=1 bash
evidence/2026-10-23-sdd-stop-guard/launch-all.sh <view> 5`, in two tracked
background jobs, as the addendum registered. Batch A, the view
`manifest-z4-a.tsv` (`p1` to `p5`), ran as tracked job
`z4-batch-a-20261105T185513Z-134f`, started at 18:55:22Z. Batch B, the view
`manifest-z4-b.tsv` (`p6` to `p10`), ran as tracked job
`z4-batch-b-20261105T195940Z-575f`, started at 19:59:48Z, after batch A had
finished. `logs/z4/campaign-z4-a.out` and `logs/z4/campaign-z4-b.out` each
close with `all launches finished; launchers non-zero: 0; manifest rows
without a DONE log: 0`. Every launch log reads the root at `36a6255`, clean,
before and after its run, Claude Code 2.1.317 both times, provider `vertex`,
model `claude-opus-5-5`, and evals `bfc4302`, whose harness paths are
identical to the pin. No launch was refused, no run is void, and no
replacement row was added.

| Row | Run id | Started | Finished | Closing | Tally |
|---|---|---|---|---|---|
| p1 | `sdd-turn-liveness-claude-auto-20261105T185523Z-13eb` | 18:55:23Z | 19:47:32Z | `DONE 0` | counted |
| p2 | `sdd-turn-liveness-claude-auto-20261105T185523Z-6a7f` | 18:55:23Z | 19:55:14Z | `DONE 0` | counted |
| p3 | `sdd-turn-liveness-claude-auto-20261105T185523Z-95e8` | 18:55:23Z | 19:59:23Z | `DONE 0` | counted |
| p4 | `sdd-turn-liveness-claude-auto-20261105T185523Z-4989` | 18:55:23Z | 19:44:58Z | `DONE 0` | counted |
| p5 | `sdd-turn-liveness-claude-auto-20261105T185523Z-560c` | 18:55:23Z | 19:50:07Z | `DONE 0` | counted |
| p6 | `sdd-turn-liveness-claude-auto-20261105T195949Z-99a8` | 19:59:48Z | 21:00:22Z | `DONE 0` | counted |
| p7 | `sdd-turn-liveness-claude-auto-20261105T195949Z-6dcc` | 19:59:48Z | 20:55:08Z | `DONE 0` | counted |
| p8 | `sdd-turn-liveness-claude-auto-20261105T195949Z-e703` | 19:59:48Z | 21:07:30Z | `DONE 0` | counted |
| p9 | `sdd-turn-liveness-claude-auto-20261105T195949Z-0c06` | 19:59:48Z | 20:55:04Z | `DONE 0` | counted |
| p10 | `sdd-turn-liveness-claude-auto-20261105T195949Z-d20c` | 19:59:48Z | 21:00:22Z | `DONE 0` | counted |

All times are on 2026-11-05; Finished is the launch log's `finished=` stamp.
The ten runs have quorum's final status `pass` and the Gauntlet's status
`pass`. No capped void occurred.

### Archive

The controller ran `LOGS=logs/z4 bash archive-runs.sh treatment
task-21-runs` from this directory outside the sandbox. It exited 0, archived
all ten runs, each stripped from about 22 MB to about 5 MB, and printed:

```
post-check treatment sdd-turn-liveness-claude-auto-20261105T185523Z-13eb: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261105T195949Z-d20c: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261105T185523Z-6a7f: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261105T185523Z-95e8: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261105T185523Z-4989: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261105T185523Z-560c: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261105T195949Z-99a8: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261105T195949Z-6dcc: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261105T195949Z-e703: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261105T195949Z-0c06: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
```

Every run reached Finish, published one receipt, kept its session mirror and
recorded the last task's mark. The archive was not rerun.

### The ten runs

Each run was read with `python3 analyze.py task-21-runs/treatment/<run>`.
Every run reads `void` none, `final` pass, no decision conflict, `h1` true
with `h1_bound` `finish-result` and `off_plan_lines` 0, no censored stop, and
provenance matching the pin: `cc` 2.1.317, `model` claude-opus-5-5, recorded
models `claude-haiku-4-5-20251001`, `claude-opus-5-5` and
`claude-sonnet-5-5`, the plugin directory the contingency's root, Codex
absent, the task tools on, and `evals_commit` `bfc4302` with a clean tree.
The tally prints no problem for any row.

The decision record and the STOP list:

| Row | Run | `decisions_total` | `plan_decisions` | `no-ledger` allows | Blocks | Listed stops | In-turn | Unmatched | `neither` |
|---|---|---|---|---|---|---|---|---|---|
| p1 | `13eb` | 2 | 0 | 2 | 0 | 3 | 2 | 0 | 0 |
| p2 | `6a7f` | 2 | 0 | 2 | 0 | 4 | 3 | 0 | 0 |
| p3 | `95e8` | 3 | 0 | 3 | 0 | 4 | 2 | 0 | 1 |
| p4 | `4989` | 2 | 0 | 2 | 0 | 3 | 2 | 0 | 0 |
| p5 | `560c` | 2 | 0 | 2 | 0 | 3 | 2 | 0 | 0 |
| p6 | `99a8` | 2 | 0 | 2 | 0 | 2 | 1 | 0 | 0 |
| p7 | `6dcc` | 2 | 0 | 2 | 0 | 3 | 2 | 0 | 0 |
| p8 | `e703` | 2 | 0 | 2 | 0 | 3 | 2 | 0 | 0 |
| p9 | `0c06` | 2 | 0 | 2 | 0 | 3 | 2 | 0 | 0 |
| p10 | `d20c` | 2 | 0 | 2 | 0 | 2 | 1 | 0 | 0 |
| Total | | 21 | 0 | 21 | 0 | 30 | 19 | 0 | 1 |

The mechanism measures (seconds from each call or launch to its result or
exit; a short soak the analyzer did not read as an execution shows its call's
time in parentheses):

| Row | Run | Foreground dispatches | Background | Unclassified | Untracked | Short soak s | `short_ok` | Long job s | `long_ok` | Live-shell turn ends | `success` |
|---|---|---|---|---|---|---|---|---|---|---|---|
| p1 | `13eb` | 13 | 0 | 0 | 0 | none read (240.6) | false | 721.4 | false | 0 | true |
| p2 | `6a7f` | 13 | 0 | 0 | 0 | 241.7 | true | 720.6 | true | 0 | true |
| p3 | `95e8` | 13 | 0 | 0 | 0 | 240.4 | true | 721.6 | true | 0 | true |
| p4 | `4989` | 13 | 0 | 0 | 0 | 240.3 | true | 721.2 | true | 0 | true |
| p5 | `560c` | 15 | 0 | 0 | 0 | 240.3 | true | 720.8 | false | 0 | true |
| p6 | `99a8` | 13 | 0 | 0 | 0 | 240.8 | true | 723.3 | true | 0 | true |
| p7 | `6dcc` | 13 | 0 | 0 | 0 | 242.7 | true | 722.0 | false | 0 | true |
| p8 | `e703` | 13 | 0 | 0 | 0 | 241.5 | true | 728.6 | true | 0 | true |
| p9 | `0c06` | 13 | 0 | 0 | 0 | none read (243.2) | false | 722.9 | true | 0 | true |
| p10 | `d20c` | 15 | 0 | 0 | 0 | 241.4 | true | 722.2 | true | 0 | true |

No receipt's ledger holds a `fix round` line: in every run each
task had one implementer dispatch and one review dispatch, and the review
approved it. The contingency's change, a fresh foreground implementer for
rounds 1 to 3, therefore never ran, and no main transcript holds a
`SendMessage` call. The two extra dispatches in `560c` and `d20c` are the
final review's one fix wave, a fresh foreground Agent call followed by a
foreground scoped re-review, which is the final wave's path before and after
the contingency. In `6a7f` the final review returned an Important finding
that conflicts with behavior the plan specifies; the session asked, was
answered inside the turn, and ran no fix wave.

Every run has two turn ends except `95e8`, which has three, and every one
comes after Finish's result. The first is the finishing menu, which ends
"Which option?"; the second is the session's report after the merge; `95e8`'s
third answers the driver's "continue". The hook answered each of the 21 with a
`no-ledger` allow 0.15 to 2.13 s after the turn end; the first allow of a run
came 14.8 to 28.2 s after Finish's result, the second 122.9 to 182.1 s after
it, and `95e8`'s third 369.4 s after it. The hook's own `elapsed_ms` on those
21 decisions runs from 33 to 938. Every line is in the session mirror alone:
no receipt holds a `stop-guard.jsonl`. No turn end fell between a run's
`ledger_started` and its `receipt_published`.

The Gauntlet listed 30 STOP entries across the ten runs, 29 labelled
`question` and one labelled `neither`. Eleven are turn ends: the finishing
menu once per run, each matched to that run's first `no-ledger` allow, and
`95e8`'s report after the merge, matched to its second. Nineteen are in-turn
stops, timed by AskUserQuestion calls answered inside their turn: eighteen
are pre-flight questions before Task 1, in all ten runs, and one is `6a7f`'s
question at 19:32:42Z, after its final review and with its ledger live,
whether a float-drift miscount the review found in `simulate` should be fixed
against the plan's specified behavior, answered inside the turn at 19:35:01Z
("implement the plan exactly as written"). Every run asked the fixture's
`DEFAULT_WINDOW_SECONDS` question with AskUserQuestion before Task 1 and had
it answered inside the turn.

`95e8`'s `neither` entry is the turn end at 19:38:37.693Z, whose last sentence
is "The four optional items from the final review are still open." It came
157.2 s after Finish's result (19:36:00.529Z) and after the session had
merged into `main`; the hook allowed it as `no-ledger` 1.03 s later. The
Gauntlet's own note says the receipt existed but the agent had never reported
it, so the driver's rule applied: it waited, sent "continue" at 19:41:03Z, and
labelled the stop `neither`. `95e8` is the one run whose session text never
mentions the receipt; the other nine mention it, seven in the finishing-menu
turn and two in the report after the merge.

Four runs miss F, and the five readings behind that are each of a command's
shape:

- `13eb` and `0c06` ran the short soak as `time python3 -m unittest
  tests.test_soak_short -v 2>&1 | tail -5`, in a foreground call with a
  420000 ms timeout that returned after 240.6 s and 243.2 s. The soak reader
  counts only a `python3 -m unittest` invocation at the start of a shell
  command, and `time` comes first, so neither run has a main-session
  execution of the short soak on record, and a run with none fails the rule.
- `13eb` and `560c` closed their last watch of the long soak with
  `tracked-job wait <jobdir> --max-ms <n>; date -u`. Each call printed
  `status=exited code=0` and then the date, and the watch reader takes the
  verdict from the last line alone, because a success line above it could be
  another command's output.
- `6dcc` watched with `W=$(sdd-dir plan.md); tracked-job wait
  $W/jobs/<job> --max-ms 300000`, which ended in `status=exited code=0`. The
  watch reader reads any call that carries a command substitution as
  unproven, because a fragment of the substitution's body could pose as the
  final command.

The analyzer's docstrings name both watch readings as false negatives the rule
accepts to keep a forged success out. Each of the five calls ran in the
foreground. The two short soaks had 420000 ms timeouts and returned after
more than 240 s. The three watches started after their job's launch and
returned after its end, and each job record says `exited` with code 0 after
more than 720 s. Read by the pre-registered analyzer the five are misses, F is
6 of 10, and H4 fails. A change to either reader now would be a Correction
made after this tally.

In seven runs the first watch of the long soak was a foreground
`tracked-job wait` call with a timeout of 610000 ms, which Claude Code
returned at 600 s with "Command did not complete within its 600s timeout and
was moved to the background"; each of those sessions then watched again in
the foreground. In the other three the first watch returned `status=running`
at its own bound. No turn ended while any moved call ran, and the tripwire
counted no untracked launch.

### Adjudication

No counted run holds a `block`, an allow whose reason is `handback-text`,
`handback-line` or `cap`, or a `log-failed` allow. The only decisions are 21
post-Finish `no-ledger` allows, which owe none; `95e8`'s second allow is one
of them, and the `neither` entry it answers is H2's first half, which reads
the Gauntlet's list and takes no label. `adjudications.tsv` gains no row, no
agent message was read for a label, and `false_handbacks`, `false_blocks`,
`unadjudicated_allows` and `unadjudicated_blocks` are 0 in every run because
there was nothing to count.

### Tally

`python3 tally.py --manifest manifest-z4.tsv --logs logs/z4 --archive
task-21-runs/treatment --out tally-z4.txt` from this directory wrote
`tally-z4.txt`; rerun with `--out` to another file it writes the same bytes,
and `tally.txt` is unchanged. Its decision lines:

```
runs_h1: 10
runs_with_plan_decisions: 0
H1: True
neither_listed_total: 1
false_handbacks_total: 0
unadjudicated_allows_total: 0
H2: False
false_blocks_total: 0
unadjudicated_blocks_total: 0
H3: True
foreground_share: 1.0
untracked_total: 0
f_runs: 6
live_shell_turn_ends_total: 0
H4: False
success_runs: 10
R: True
decision: FAIL
```

| Criterion | Threshold | Reading | Holds |
|---|---|---|---|
| H1 (Correction 9): no off-plan hook line in the plan window | `h1` in every counted run | `plan_decisions` 0 in 10 of 10; no hook line fell in any run's plan window; `h1` 10 of 10 | yes, with no decision under a plan |
| H2 | `neither_listed` 0; false hand-backs 0; unadjudicated allows 0 | 1 of 30 listed (`95e8`, after Finish's result); 0; 0, with no allow owing a label | no |
| H3 | false blocks 0; unadjudicated blocks 0 | 0; 0, with no block | yes, with no cases |
| H4 | foreground share at least 0.9; untracked 0; F at least 9 of 10; live-shell turn ends 0 | 1.0 (134 of 134); 0; 6; 0 | no |
| R | at least 7 successful runs | 10 | yes |

### What the counted runs show and do not show

The decision of record is FAIL, on H2 and H4. H2 failed because one stop
reached the human partner, as the Gauntlet read it, with neither a question
nor a BLOCKED report: `95e8`'s report after the merge. That stop came after
`sdd-state finish` had removed the ledger, where the guard by design answers
`no-ledger`, and the driver counted it because the session never said that
Finish had published its receipt. H4 failed on F alone: the dispatch share,
the untracked launches and the live-shell turn ends held, and the five F
misses are the command shapes described under "The ten runs".

What held: all 134 SDD dispatches ran in the foreground, no launch was
untracked, every run watched the long soak through `tracked-job wait` to
`status=exited code=0` and ran the short soak in a foreground call of about
240 s (the analyzer does not read the watch that way in `13eb`, `560c` and
`6dcc`, or the short soak in `13eb` and `0c06`), no turn ended with only a
tracked shell live, and all ten plans completed with
a receipt, a final review and passing tests. The hook ran at every one of the
21 turn ends, within 2.2 s of each, its record holds no conflicting line, and
its `no-ledger` answer after Finish is the correct one.

The runs do not show any decision the guard makes about a plan. Its refusal
of a premature stop, its refusal while a tracked shell is live, its release
of a recorded hand-back, `live-agent`, its cap and its fail-open path were not
exercised live in any counted run, so H2's adjudication half and H3 held with
no cases, and H1 holds because no line fell in its window at all. Every
session ran its plan from the first prompt to Finish's result in one turn, so
no turn ended while a ledger existed. Read with H1 as the spec first wrote it
(`plan_decisions >= 1`), every run fails H1 as well.

The runs do not show the contingency's change at work. It changes how fix
rounds 1 to 3 of a task's loop are dispatched on Claude Code, and no task in
any of the ten runs needed a fix round. These runs neither show nor refute
that a fix round on Claude Code now keeps the turn open; the fresh foreground
fix round has no live measurement in this campaign.

Under Correction 9 a PASS would have meant that no stop reached the human
partner as a `neither` stop and that the mechanism criteria held. This FAIL
means the first did not hold in one run, at a stop after the guard's scope
ends, and the second did not hold as the analyzer reads five calls. Neither
failure is a decision the guard got wrong, and neither passes through the
path the contingency changed.

The first campaign's PASS (`tally.txt`, Claude Code 2.1.302, treatment
`4a4f354`) and this FAIL (`tally-z4.txt`, Claude Code 2.1.317, treatment
`36a6255`) differ in the Claude Code version as well as the treatment, so no
difference between them can be attributed to the treatment alone.

### Limits

H2's first half is the Gauntlet's reading of each run, and its one `neither`
entry turns on the scenario's done condition, which counts the plan
unfinished until the session reports that Finish published its receipt. The
guard's scope ends when Finish removes the ledger, so a stop the driver lists
after that point is one the guard cannot refuse; the rule counts it all the
same, and it was applied as written.

F is 6 of 10 on five shape readings: three are readings of two watch shapes
the analyzer documents as accepted false negatives, and two follow from the
soak reader's rule that only a `python3 -m unittest` invocation at the start
of a shell command counts.

No task needed a fix round, so the contingency's change ran in no counted
run, and the Claude Code version changed between the campaigns (2.1.302, then
2.1.317), as the addendum records.

There is no control arm, and the scenario is short and fresh: every session
ran its plan in one turn, so the guard never judged a plan, as in the first
campaign. The field rule over the after-window is where the guard's decisions
under a plan will be read.

## Results (Z4 contingency, second re-measure)

Recorded by Task 21 on 2026-11-06, from the archive under
`task-21-runs/z4b/treatment/`, with the analyzers at the pins entry 12 records
(`liveness.py` `4b56247c`, `analyze.py` `ae23acdc`, `tally.py` `23e39ffb`).
The ten runs are the ones "Pre-registration addendum (Z4 contingency, second
re-measure)" registered: treatment `36a6255`, root `hp-treatment-z4`, Claude
Code 2.1.317, under `manifest-z4b.tsv`. `tally-z4b.txt` is the decision of
record for the release.

The second re-measure passes its rule. `tally.py` reads ten counted runs and
prints `decision: PASS`, with H1, H2, H3, H4 and R true. No entry on any
Gauntlet list is labelled `neither`, F is 10 of 10, all 136 SDD dispatches ran
in the foreground, no launch was untracked, no turn ended with only a tracked
shell live, and all ten runs succeeded.

As in both earlier campaigns, the guard made no decision under a plan.
`plan_decisions` is 0 in all ten runs, and the hook's whole record is 20
`no-ledger` allows, two per run, all after Finish's result. The contingency's
own change was not exercised either: no task in any run needed a fix round,
so no run dispatched a fix-round implementer of either kind, and no run called
`SendMessage`.

One F reading depends on Correction 12. `68d1` closed its watch of the long
soak with a wait reached through a command substitution assigned before it,
which the analyzer before the Correction read as unproven. Every other soak
and watch in the ten runs reads the same with or without the Correction, and
no run used a `time` prefix, a closing `date` or a shell wrapper. Read
without the Correction, F is 9 of 10, which still meets the threshold, so the
decision does not turn on it (The ten runs, below).

The first campaign's tally (`tally.txt`) is PASS at treatment `4a4f354` on
Claude Code 2.1.302; this one is PASS at treatment `36a6255` on Claude Code
2.1.317. The two sets of runs differ in the Claude Code version as well as the
treatment, so no difference between the tallies can be attributed to the
treatment alone. The Z4 contingency campaign (`tally-z4.txt`, FAIL) and this
one share the treatment and the Claude Code version, but they are separate
samples of ten runs, read with different analyzers: Correction 12 lies between
them.

### Launches

The controller launched the ten rows from the evals worktree, outside the
command sandbox, with `LOGS` set to this directory's `logs/z4b`:
`ANTHROPIC_MODEL=claude-opus-5-5 CLAUDE_CODE_ENABLE_TODO_TOOLS=1 bash
evidence/2026-10-23-sdd-stop-guard/launch-all.sh <view> 5`, in two tracked
background jobs, as the second addendum registered. Batch A, the view
`manifest-z4b-a.tsv` (`p1` to `p5`), ran as tracked job
`z4b-batch-a-20261106T042524Z-7e9b`, started at 04:25:34Z. Batch B, the view
`manifest-z4b-b.tsv` (`p6` to `p10`), ran as tracked job
`z4b-batch-b-20261106T052624Z-0b5a`, started at 05:26:32Z, after batch A had
finished. `logs/z4b/campaign-z4b-a.out` and `logs/z4b/campaign-z4b-b.out` each
close with `all launches finished; launchers non-zero: 0; manifest rows
without a DONE log: 0`. Every launch log reads the root at `36a6255`, clean,
before and after its run, Claude Code 2.1.317 both times, provider `vertex`,
model `claude-opus-5-5`, the task tools on, harness pin `33523dad`, and evals
`a12905c`, whose harness paths are identical to the pin. No launch was
refused, no run is void, and no replacement row was added.

| Row | Run id | Started | Finished | Closing | Tally |
|---|---|---|---|---|---|
| p1 | `sdd-turn-liveness-claude-auto-20261106T042534Z-68d1` | 04:25:34Z | 05:21:45Z | `DONE 0` | counted |
| p2 | `sdd-turn-liveness-claude-auto-20261106T042534Z-3dbc` | 04:25:34Z | 05:23:20Z | `DONE 0` | counted |
| p3 | `sdd-turn-liveness-claude-auto-20261106T042534Z-bb09` | 04:25:34Z | 05:21:09Z | `DONE 0` | counted |
| p4 | `sdd-turn-liveness-claude-auto-20261106T042534Z-beaf` | 04:25:34Z | 05:26:06Z | `DONE 0` | counted |
| p5 | `sdd-turn-liveness-claude-auto-20261106T042534Z-73e9` | 04:25:34Z | 05:22:31Z | `DONE 0` | counted |
| p6 | `sdd-turn-liveness-claude-auto-20261106T052633Z-c39f` | 05:26:32Z | 06:21:45Z | `DONE 0` | counted |
| p7 | `sdd-turn-liveness-claude-auto-20261106T052633Z-05b8` | 05:26:32Z | 06:22:51Z | `DONE 0` | counted |
| p8 | `sdd-turn-liveness-claude-auto-20261106T052633Z-ba60` | 05:26:32Z | 06:20:07Z | `DONE 0` | counted |
| p9 | `sdd-turn-liveness-claude-auto-20261106T052633Z-b544` | 05:26:32Z | 06:19:47Z | `DONE 0` | counted |
| p10 | `sdd-turn-liveness-claude-auto-20261106T052633Z-8463` | 05:26:32Z | 06:22:31Z | `DONE 0` | counted |

All times are on 2026-11-06 (UTC); Started and Finished are the launch log's
`started=` and `finished=` stamps. The ten runs have quorum's final status
`pass` and the Gauntlet's status `pass`. No capped void occurred.

### Archive

The controller ran `LOGS=logs/z4b bash archive-runs.sh treatment
task-21-runs/z4b` from this directory outside the sandbox, as tracked job
`archive-z4b-20261106T062311Z-57ba`. It exited 0, archived all ten runs, each
stripped from about 22 MB to about 5 MB, and printed:

```
post-check treatment sdd-turn-liveness-claude-auto-20261106T042534Z-68d1: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261106T052633Z-8463: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261106T042534Z-3dbc: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261106T042534Z-bb09: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261106T042534Z-beaf: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261106T042534Z-73e9: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261106T052633Z-c39f: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261106T052633Z-05b8: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261106T052633Z-ba60: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check treatment sdd-turn-liveness-claude-auto-20261106T052633Z-b544: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
```

Every run reached Finish, published one receipt, kept its session mirror and
recorded the last task's mark. The archive was not rerun.

### The ten runs

Each run was read with `python3 analyze.py task-21-runs/z4b/treatment/<run>`.
Every run reads `void` none, `final` pass, no decision conflict, `h1` true
with `h1_bound` `finish-result` and `off_plan_lines` 0, no censored stop, and
provenance matching the pin: `cc` 2.1.317, `model` claude-opus-5-5, recorded
models `claude-haiku-4-5-20251001`, `claude-opus-5-5` and
`claude-sonnet-5-5`, the plugin directory the contingency's root, Codex
absent, the task tools on, and `evals_commit` `a12905c` with a clean tree.
The tally prints no problem for any row.

The decision record and the STOP list:

| Row | Run | `decisions_total` | `plan_decisions` | `no-ledger` allows | Blocks | Listed stops | In-turn | Unmatched | `neither` |
|---|---|---|---|---|---|---|---|---|---|
| p1 | `68d1` | 2 | 0 | 2 | 0 | 2 | 1 | 0 | 0 |
| p2 | `3dbc` | 2 | 0 | 2 | 0 | 1 | 0 | 0 | 0 |
| p3 | `bb09` | 2 | 0 | 2 | 0 | 2 | 1 | 0 | 0 |
| p4 | `beaf` | 2 | 0 | 2 | 0 | 3 | 2 | 0 | 0 |
| p5 | `73e9` | 2 | 0 | 2 | 0 | 1 | 0 | 0 | 0 |
| p6 | `c39f` | 2 | 0 | 2 | 0 | 3 | 2 | 0 | 0 |
| p7 | `05b8` | 2 | 0 | 2 | 0 | 4 | 3 | 0 | 0 |
| p8 | `ba60` | 2 | 0 | 2 | 0 | 3 | 2 | 0 | 0 |
| p9 | `b544` | 2 | 0 | 2 | 0 | 3 | 2 | 0 | 0 |
| p10 | `8463` | 2 | 0 | 2 | 0 | 3 | 2 | 0 | 0 |
| Total | | 20 | 0 | 20 | 0 | 25 | 15 | 0 | 0 |

The mechanism measures (seconds from each call or launch to its result or
exit):

| Row | Run | Foreground dispatches | Background | Unclassified | Untracked | Short soak s | `short_ok` | Long job s | `long_ok` | Live-shell turn ends | `success` |
|---|---|---|---|---|---|---|---|---|---|---|---|
| p1 | `68d1` | 15 | 0 | 0 | 0 | 241.0 | true | 721.7 | true | 0 | true |
| p2 | `3dbc` | 13 | 0 | 0 | 0 | 240.4 | true | 721.6 | true | 0 | true |
| p3 | `bb09` | 13 | 0 | 0 | 0 | 240.3 | true | 720.6 | true | 0 | true |
| p4 | `beaf` | 13 | 0 | 0 | 0 | 241.9 | true | 720.5 | true | 0 | true |
| p5 | `73e9` | 15 | 0 | 0 | 0 | 241.3 | true | 720.7 | true | 0 | true |
| p6 | `c39f` | 13 | 0 | 0 | 0 | 241.1 | true | 721.2 | true | 0 | true |
| p7 | `05b8` | 13 | 0 | 0 | 0 | 240.3 | true | 720.7 | true | 0 | true |
| p8 | `ba60` | 13 | 0 | 0 | 0 | 240.2 | true | 721.1 | true | 0 | true |
| p9 | `b544` | 15 | 0 | 0 | 0 | 240.2 | true | 721.1 | true | 0 | true |
| p10 | `8463` | 13 | 0 | 0 | 0 | 241.1 | true | 721.1 | true | 0 | true |

No receipt's ledger holds a `fix round` line: in every run each task had one
implementer dispatch and one review dispatch, and the review approved it. The
contingency's change, a fresh foreground implementer for rounds 1 to 3,
therefore never ran, and no main transcript holds a `SendMessage` call. Every
Agent call in every main transcript passed `run_in_background: false`. The two
extra dispatches in `68d1`, `73e9` and `b544` are the final review's one fix
wave, a fresh foreground Agent call followed by a foreground re-review, which
is the final wave's path before and after the contingency. In `68d1` and
`73e9` the final review returned one Important finding; in `b544` it returned
only Minor ones, three of which the session chose to fix. In the other seven
runs the final review returned no Critical or Important finding and no fix
wave ran.

Every short soak the analyzer counted is a plain `python3 -m unittest
tests.test_soak_short -v 2>&1 | tail -<n>`, alone in its call (`b544`) or the
last command after a `;` or a newline, in a foreground call with a timeout of
420000 to 600000 ms. In `68d1`, `73e9`, `c39f` and `8463` the same call
assigns `W=$(sdd-dir plan.md)` on an earlier line, which the soak reader reads
past at either pin. Every closing watch of the long soak is a bare
`tracked-job wait <jobdir> --max-ms <n>` with the job directory written out,
whose last line is `status=exited code=0`, except in `68d1`, whose closing
watch is `S=<scripts>; W=$($S/sdd-dir plan.md); $S/tracked-job wait
$W/jobs/<job> --max-ms 420000`: the substitution shape Correction 12 admits.
No soak or watch in the ten runs carries a `time` prefix, a closing `date` or
a shell wrapper. A read of the ten runs with the analyzer before the
Correction (`analyze.py` `6dd98e4b`, run from a scratch copy for comparison
only) prints the same JSON as the pinned analyzer for nine runs; in `68d1` it
reads `long_ok` false and nothing else differs.

In six runs (`68d1`, `3dbc`, `bb09`, `beaf`, `73e9`, `b544`) the first watch
of the long soak was a foreground `tracked-job wait` call with a timeout of
610000 ms, which Claude Code returned at 600 s with "Command did not complete
within its 600s timeout and was moved to the background"; each of those
sessions then watched again in the foreground. In the other four the first
watch returned `status=running` at its own bound. No turn ended while any
moved call ran, and the tripwire counted no untracked launch.

Every run has two turn ends, and both come after Finish's result. The first is
the finishing menu, which ends "Which option?"; the second is the session's
report after the merge. The hook answered each of the 20 with a `no-ledger`
allow 0.12 to 0.26 s after the turn end; the first allow of a run came 16.6 to
22.5 s after Finish's result, the second 92.8 to 159.9 s after it. The hook's
own `elapsed_ms` on those 20 decisions runs from 23 to 81. Every line is in
the session mirror alone: no receipt holds a `stop-guard.jsonl`. No turn end
fell between a run's `ledger_started` and its `receipt_published`. All ten
sessions' text mentions the receipt.

The Gauntlet listed 25 STOP entries across the ten runs, every one labelled
`question`. Ten are turn ends, the finishing menu once per run, each matched
to that run's first `no-ledger` allow. Fifteen are in-turn stops, timed by
AskUserQuestion calls answered inside their turn, all before Task 1, in eight
runs. Every run asked the fixture's `DEFAULT_WINDOW_SECONDS` question with
AskUserQuestion before Task 1 and had it answered inside the turn: seven runs
asked a separate workspace question first, and three asked one combined call,
17 pre-flight calls in all. No run asked a question after Task 1 began. In
`3dbc` and `73e9` the Gauntlet listed only the finishing menu, although both
sessions asked their pre-flight questions that way.

### Adjudication

No counted run holds a `block`, an allow whose reason is `handback-text`,
`handback-line` or `cap`, or a `log-failed` allow. The only decisions are 20
post-Finish `no-ledger` allows, which owe none. `adjudications.tsv` gains no
row, no agent message was read for a label, and `false_handbacks`,
`false_blocks`, `unadjudicated_allows` and `unadjudicated_blocks` are 0 in
every run because there was nothing to count.

### Tally

`python3 tally.py --manifest manifest-z4b.tsv --logs logs/z4b --archive
task-21-runs/z4b/treatment --out tally-z4b.txt` from this directory wrote
`tally-z4b.txt`; rerun with `--out` to another file it writes the same bytes,
and `tally.txt` and `tally-z4.txt` are unchanged. Its decision lines:

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
f_runs: 10
live_shell_turn_ends_total: 0
H4: True
success_runs: 10
R: True
decision: PASS
```

| Criterion | Threshold | Reading | Holds |
|---|---|---|---|
| H1 (Correction 9): no off-plan hook line in the plan window | `h1` in every counted run | `plan_decisions` 0 in 10 of 10; no hook line fell in any run's plan window; `h1` 10 of 10 | yes, with no decision under a plan |
| H2 | `neither_listed` 0; false hand-backs 0; unadjudicated allows 0 | 0 of 25 listed; 0; 0, with no allow owing a label | yes, its adjudication half with no cases |
| H3 | false blocks 0; unadjudicated blocks 0 | 0; 0, with no block | yes, with no cases |
| H4 | foreground share at least 0.9; untracked 0; F at least 9 of 10; live-shell turn ends 0 | 1.0 (136 of 136); 0; 10; 0 | yes |
| R | at least 7 successful runs | 10 | yes |

### What the counted runs show and do not show

Under Correction 9 a PASS means that no stop reached the human partner as a
`neither` stop on the Gauntlet's list and that the mechanism criteria held.
Both are what these runs show. All 136 SDD dispatches ran in the foreground,
no launch was untracked, every run watched the long soak through
`tracked-job wait` to `status=exited code=0` and ran the short soak in a
foreground call of about 240 s, no turn ended with only a tracked shell live,
and all ten plans completed with a receipt, a final review and passing tests.
The hook ran at every one of the 20 turn ends, within 0.3 s of each, its
record holds no conflicting line, and its `no-ledger` answer after Finish is
the correct one.

The runs do not show any decision the guard makes about a plan. Its refusal
of a premature stop, its refusal while a tracked shell is live, its release
of a recorded hand-back, `live-agent`, its cap and its fail-open path were not
exercised live in any counted run, so H2's adjudication half and H3 held with
no cases, and H1 holds because no line fell in its window at all. Every
session ran its plan from the first prompt to Finish's result in one turn, so
no turn ended while a ledger existed; the absence of a premature stop belongs
to those sessions and cannot be credited to the hook. Read with H1 as the spec
first wrote it (`plan_decisions >= 1`), every run fails H1 and the campaign is
FAIL on H1, as both earlier campaigns would be.

The runs do not show the contingency's change at work. It changes how fix
rounds 1 to 3 of a task's loop are dispatched on Claude Code, and no task in
any of the ten runs needed a fix round, as in the first contingency campaign.
Across the twenty contingency runs the fresh foreground fix round has no live
measurement, so these runs neither show nor refute that a fix round on Claude
Code now keeps the turn open, which is the failure Z4 recorded.

Correction 12 decided one reading in these runs and not the decision: its
substitution reading gave `68d1` its long watch, the shape `6dcc` used in the
first contingency campaign, and without it F is 9 of 10, at the threshold.
The `time` prefix and the closing `date` it also admits read nothing here,
because no run used those shapes, so these runs do not test those two
readings.

The first campaign's PASS (`tally.txt`, Claude Code 2.1.302, treatment
`4a4f354`) and this PASS (`tally-z4b.txt`, Claude Code 2.1.317, treatment
`36a6255`) differ in the Claude Code version as well as the treatment, so no
difference between them can be attributed to the treatment alone. The Z4
contingency campaign's FAIL (`tally-z4.txt`) and this PASS share the treatment
and the Claude Code version and differ in the analyzer, Correction 12, and in
the sample: they are two sets of ten runs, not one set read twice. That FAIL
rested on one `neither` entry after Finish, in a session that never reported
the receipt, and on five F readings of three command shapes. Here every
session's text mentions the receipt, and of those shapes only the
substitution recurred, in one run, which the corrected reader reads. That
the H2 failure did not recur in these ten runs shows it need not occur, not
that it cannot.

### Limits

H2's first half is the Gauntlet's reading of each run. Its lists omitted the
pre-flight questions in two runs that asked them (`3dbc`, `73e9`), and nothing
on any list was labelled `neither`. The scenario's done condition, which
counts the plan unfinished until the session reports the receipt, is
unchanged, so a session that does not report it can still fail H2 at a stop
after the guard's scope ends; every session's text here mentions it.

F is 10 of 10, and one of the ten, `68d1`, reads as handled only through the
substitution reading Correction 12 added after the first contingency campaign
was tallied and before these runs were launched. The addendum registered the
Correction for these runs, so that reading is the rule as registered; without
it F is 9 of 10.

No task needed a fix round, so the contingency's change ran in none of these
runs, and across both contingency campaigns it has no live case. These runs
and the first campaign differ in the Claude Code version (2.1.302 in the first
campaign, 2.1.317 in both contingency campaigns), as the first addendum
records.

There is no control arm, and the scenario is short and fresh: every session
ran its plan in one turn, so the guard never judged a plan, as in both
earlier campaigns. The field rule over the after-window is where the guard's
decisions under a plan will be read.

## Known limits of the pinned analyzer (final gate, 2026-11-06)

The Codex final whole-branch gate of 2026-11-06 found three shapes the pinned
`analyze.py` misreads. The analyzer stays as entry 12 pins it, because it is
the instrument of the three finished campaigns (`tally.txt`, `tally-z4.txt`
and `tally-z4b.txt`), and changing it after their decisions would itself be a
post-hoc change to the instrument. A check over every archived run, reading
the archives through the analyzer's own readers, found none of the three
shapes. It read 35 runs: 2 in the smoke, 2 in T1, 11 in the first campaign,
10 in the Z4 contingency campaign and 10 in its second re-measure. Three of
them are the setup voids (`7ffc` in the smoke, `f352` in T1 and `1716` in the
first campaign), which have no transcript and no Gauntlet record, so none of
the shapes can occur in them. No recorded field, tally line or decision
depends on the three shapes. The check script is kept with the controller's
records and is not committed.

E1 is in the `final_review` measure. It credits the last successful review
dispatched after the last implementer dispatch, but only a description
naming `implement` or `takeover` moves that boundary, and a description
naming a fix is never a review. A final-review fix dispatch ("Fix final-review
finding") therefore leaves the whole-branch review from before the fix
credited, and `final_review` reads true when no successful re-review follows
the fix. The error runs toward `success`, which requires `final_review`. Seven
archived runs had a final fix wave after the credited review: `3ccc` in the
smoke, `3425` (p7) in the first campaign, `560c` (p5) and `d20c` (p10) in Z4,
and `68d1` (p1), `73e9` (p5) and `b544` (p9) in the second re-measure. In
each, a successful foreground re-review of the fix wave followed the fixer, so
a rule that lets a fix dispatch invalidate the earlier review gives the same
`final_review` as the pinned rule in all 35 runs.

E2 is in the soak-tamper scan behind `soak_tampered`. It skips a call that
errored or has no result before reading its command or path, but a shell
command can write a file and still exit non-zero. A call that modifies a soak
test file and fails, followed by one that restores it and also fails, reads as
untampered, and a restored file also passes the end-state check that the soak
files are unchanged. `soak_tampered` then reads false where it should read
true, again toward `success`. One errored call in the archive names a soak
file. In Z4 p5 (`sdd-turn-liveness-claude-auto-20261105T185523Z-560c`) a Bash
call names both soak files in a read-only command, every segment of which is
on the scan's read-only allowlist, and zsh aborted it at `echo =====`, which it
reads as a lookup of a command named `====`, before either `cat` ran. No
errored or result-less Write, Edit or MultiEdit call targets a soak file or
`tests/` in any run. A scan that also reads errored calls leaves
`soak_tampered` unchanged in every run.

E3 is in `_grading` and `stop_lines`, which read the Gauntlet's STOP list.
When `verdict.json` names a Gauntlet run (`gauntlet.run_id`) whose results
directory is missing, `_grading` falls back to a sibling grading or to none,
and a grading that is missing, does not parse or holds no STOP criterion can
read as zero listed stops. The tally then reads no `neither` entry and no
unmatched stop for the run, so the `void-instrument` the one-to-one match
would raise never fires and H2 can hold on evidence nobody read. Every graded
run, 32 of the 35, names a `gauntlet.run_id` whose directory exists, whose
`result.json` parses and which holds exactly one STOP criterion that
`_is_stops_criterion` accepts, and `_grading` chooses that directory. The
three setup voids have no `run_id` and no results directory.

A later campaign that reuses this analyzer fixes all three first: a fix
dispatch invalidates the reviews before it and a later successful re-review
in the final wave is required (E1), errored writer calls are read for writes
(E2), and a named grading that is missing, unparsable or without the STOP
criterion voids the run as an instrument failure (E3).
