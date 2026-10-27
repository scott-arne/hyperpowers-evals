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
is spec Design section 4 with the analyzer's names:

```
- Pre-registered criteria, verbatim from spec Design §4, with the analyzer's names: H1 every valid run's decision record holds at least one line for the plan (`plan_decisions >= 1`: a line whose `plan` is the run's plan, not a `no-ledger` or `ambiguous` line); H2 the Gauntlet's STOP list has no `neither` entry in any valid run (`neither_listed == 0`) and every `allow` with reason `handback-text` or `handback-line` is adjudicated a genuine hand-back (`false_handbacks == 0` and `unadjudicated_allows == 0`); H3 every `block` line in the receipt's log is adjudicated as not a legitimate hand-back (`false_blocks == 0` and `unadjudicated_blocks == 0`); H4 pooled foreground dispatch share at least 0.9, no untracked launch, both slow commands handled as the rule says in at least nine runs (the short one in the foreground, the long one through `tracked-job` and watched to `exited code=0`), no turn end with only a tracked shell live; R at least seven successful runs. The scenario passes when H1 to H4 and R hold. The decision record of a run is the union of the receipt's `stop-guard.jsonl` (or, for a run that never reached Finish, the live workspace's) and the per-session mirror, keyed by `(ts, session)`; two lines with one key and different payloads are a conflict that voids the run (`void-instrument`); every Gauntlet-listed stop is matched one-to-one, in time order, to an `allow` within a minute of it, and a listed stop without a match, or without a timestamp, makes the run `void-instrument`, outside the cap, relaunched.
```

### What each measure counts

`analyze.py` computes every per-run number and decides nothing. `tally.py`
applies the rule above to the archived runs. The definitions below are what
those two modules implement at the pins recorded under "Analyzer pins".

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

H1 counts only the lines that name the plan. `plan_decisions` is the number of
decisions whose `plan` field equals the plan path the run's ledger identity
line gives, so a `no-ledger` or `ambiguous` line, which names no plan, is not
one of them.

The Gauntlet's STOP list comes from one grading. `verdict.json`'s
`gauntlet.run_id` names the results directory quorum composed its verdict
from, and the entries are read from the one criterion of that directory's
`result.json` that holds the list; `result.md` answers only when the
structured result is not there. Every entry in that list counts, so two stops
quoting one sentence are two entries, each owed its own decision.

The list covers every stop until the plan's finish step has run, not only
stops taken with a task still open: the scenario's driver rule and its
criterion are both scoped to a plan whose tasks are not all complete, whose
final whole-branch review has not run, whose work is not merged into the main
checkout, or whose finish step has not published its receipt. The guard stays
active for as long as the plan's ledger exists, which is until `sdd-state
finish` publishes that receipt, so a stop after the last task's mark, or after
the merge and before Finish, reaches the human partner exactly as a mid-task
stop does, and H2 has to see it.

Each listed stop is timed from the main transcript: the first turn end after
the previous match whose text contains the quote. The Gauntlet lists its stops
in order, so that matching is one-to-one and chronological; a quote found in
no turn end is untimed.

Each timed stop is then matched one-to-one, in time order, to an `allow` in
the window `[stop - 2 s, stop + 1 min]`, the nearest unused one, with a tie
going to the earlier allow. The two seconds cover the clock difference between
the transcript's timestamps and the hook's own. A listed stop with no allow in
its window, and a listed stop with no time at all, make the run
`void-instrument`, outside the cap, relaunched.

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
Every run therefore holds one legitimate mid-plan hand-back, which exercises
the allow path live and gives H2 and H3 a real case per run.

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
  listed stop with no matching allow or no time, or two payloads under one
  decision key.
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
it voids the run as an instrument failure.

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
- Messages typed during a foreground subagent are delayed until it returns, so
  the Gauntlet's own driving is slower in this scenario than in a backgrounded
  one. The spec's own "Known limits" list the guard's limits, as against the
  instrument's.

## Smoke

Filled in by Task 19.

## T1

Filled in by Task 19.

## Results

Filled in by Task 20.
