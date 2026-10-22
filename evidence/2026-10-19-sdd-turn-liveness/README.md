# SDD turn liveness: the pre-registered paired campaign (2026-10-19)

Written before the first counted run. The commit that adds this file is the
pre-registration record: it lands before any run exists under `task-11-runs/`
or `task-12-runs/`, and the rules below are fixed from that point. The
campaign pin is `manifest.tsv` beside this file, which `logs/measure-launch.sh`
re-checks before every launch and refuses the launch when a value differs.

## Question

Does the SDD skill text change remove premature mid-plan stops and background
waits against 6.16.1, without lowering run success?

Treatment is the hyperpowers branch at
`c353fc7b3856e6cd69c05caf9a735606d26ede38`: its five SDD dispatch templates
carry `run_in_background: false`, `subagent-driven-development/SKILL.md`
states the foreground and watch rules, and two entries are added to that
skill's rationalization list. Control is
`f1fd935cbf79898430e4aac740b547c40d9c1103`, tag v6.16.1. Both arms run the
`sdd-turn-liveness` scenario ten times under one pin, control first (plan
Task 11), then treatment (plan Task 12).

The behavior under test is the one the field shows. In Zed SDD sessions the
controller dispatches its subagents in the background, ends its turn while
they work, and the human partner, seeing an idle session, types "Resume".
Over the baseline window the field instrument counts 301 premature stops
against 1495 task boundaries, 20.13 per 100 (`field/baseline.json`, repeated
under "Field decision rule" below).

Spec: hyperpowers `docs/hyperpowers/specs/2026-10-19-sdd-turn-liveness-design.md`.
Plan: hyperpowers `docs/hyperpowers/plans/2026-10-19-sdd-turn-liveness.md`.

## Pre-registration

### The decision rule

Verbatim from the spec's Design section 2, "Decision rule":

```
**Decision rule, written into the evidence note before any run.** The
control arm runs first.

- *W1:* treatment's pooled foreground dispatch share is at least 0.9. The
  rule is behavioral and compliance is probabilistic, so the threshold
  tolerates rare misses; control's share is expected near zero under
  Claude Code's background default, so 0.9 separates the arms, and every
  miss is listed in the evidence note.
- *W2:* treatment has at most one live-work turn end across its ten runs,
  on the same reasoning; each one is listed.
- *F:* the four-minute covering command ran in the foreground, and the
  twelve-minute test followed the long-job handling, in at least nine of
  treatment's ten runs.
- *U:* treatment has no untracked launches.
- *P:* if control has at least one premature stop, treatment's total is
  lower than control's and at least nine of treatment's ten runs have none.
  If control has none, P is unmeasured by this scenario: the evidence note
  says so, the release notes make no claim about premature stops, and the
  question moves to the field decision rule in Design §3.
- *R:* at least seven of treatment's ten runs are successful, and the
  number of successful treatment runs is at least control's number minus
  one.

The scenario passes when W1, W2, F, U and R hold and P holds or is
unmeasured. A failure goes back to design; a P failure opens the Stop-hook
follow-up with these runs as its evidence.
```

### What each measure counts

`analyze.py` computes every per-run number and decides nothing. Its module
docstring fixes the definition P rests on:

```
A premature stop is a turn end before the plan's last task completes, with
no live and no censored task, that the Gauntlet-Agent's ``STOP:`` list labels
``neither``. A candidate the list does not match needs a row in
``adjudications.tsv``; until it has one it is ``unadjudicated`` and the tally
refuses to decide.
```

The rest of the measures, with the approved plan deviations that shape them
(the deviations are quoted in full in the plan's Global Constraints):

- **A turn end is found structurally** (deviation 2). Quorum's interactive
  transcripts never carry `stop_reason: end_turn`; every main-session
  assistant record says `tool_use`. A turn end is the point where the next
  main-session user record is a human message or a completion notice
  delivered as its own message, or where the transcript ends. The same rule
  serves the field transcripts.
- **A censored task excludes a stop in the scenario too** (deviation 3). A
  stop while a task that never records a completion is open is censored,
  outside both the premature and the live-work counts.
- **A foreground dispatch** is a main-session Agent call in an SDD role that
  passes the boolean `run_in_background: false` and comes back with a result
  that is not an error. The string `"false"` does not count, and neither does
  omitting the parameter. A call whose result is an async launch, or that
  passes `true`, is a background dispatch; anything else is unclassified.
  W1 pools treatment's ten runs: foreground dispatches over every
  SDD-role dispatch, the unclassified included.
- **The short soak passes F** when every main-session execution of
  `tests.test_soak_short` ran in a foreground Bash call with a timeout of at
  least its 240 s runtime and its result arrived at least 200 s after the
  call (deviation 6). A run with no main-session execution fails it.
- **The long job passes F** when every main-session execution of
  `tests.test_soak_long` was a tracked background launch (`run_in_background:
  true`, not detached) with a background timeout of at least its 720 s
  runtime, was then watched by a main-session foreground call that read that
  job's own output or exit file and saw `exit=0`, with no turn end between
  the launch and that watch result, and at least 600 s elapsed between them
  (deviation 6). A run with no main-session execution fails it.
- **A run with a main-session write to either soak file is `soak_tampered`**
  and is not a success, even when the final tree is clean (deviation 6).
- **Plan completion needs all six `Task N: complete` marks.** They are read
  from the transcript's successful ledger writes, or from a ledger that
  survived, because SDD's Finish deletes the ledger at the end of a complete
  run. A refused write is not a mark.
- **Run success** is plan completion, a final review, the fixture's unit
  tests and both soak tests passing on the main checkout, the soak files
  unchanged, and no tampering.
- **Tracked work is wider than the two launch results.** A command Claude
  Code moved to the background on its own, whose result starts "Command did
  not complete within its <N>s timeout and was moved to the background", is a
  shell launch (deviation 7). An agent resumed with `SendMessage`, whose
  successful result says the agent was resumed in the background, is an agent
  launch (deviation 8). A turn end while either runs is a live-work turn end
  (W2), not a premature stop.
- **The scenario session runs without Claude Code's fork mode and with the
  task tools on, as the Zed field does** (deviation 9). The scenario's
  `checks.sh` carries
  `# claude-env: CLAUDE_CODE_ENABLE_TODO_TOOLS=1, CLAUDE_CODE_FORK_SUBAGENT=0`;
  the launcher drops every other inherited Claude variable. Without this,
  fork mode removes the Agent tool's `run_in_background` parameter and every
  dispatch runs in the background in both arms, which is what the plan's
  Task 9 smoke found.
- **The final review** is a clean review-role dispatch at or after the last
  completion mark, or, when the controller writes that mark only after the
  final review returns, the last of at least two clean review-role dispatches
  after the last implementer dispatch, when that last one names no task (plan
  Task 9 Step 3d, `smoke.md`). Task reviews and re-reviews name their task;
  the whole-branch review does not. Without the second condition R would
  measure ledger bookkeeping order rather than whether a final review ran.
- **The control arm's dispatch mode is a per-dispatch choice, not an
  always-background baseline.** Both arms get the same Agent tool, with
  `run_in_background` present and honored; the p4 smoke's control passed
  `false` on 8 of its 13 dispatches and `true` on 5. Control's share is
  therefore not expected at zero, and W1 is a threshold on treatment's own
  share.

### Void rules

From the plan's Global Constraints, unchanged here:

- A harness setup failure is void, relaunched, with no cap.
- A Gauntlet lost to a transport failure before it wrote a result is
  `void-transport`: relaunched, no cap (Correction 1, plan deviation 10).
- Every other non-pass, non-fail outcome (a grader exit without a result, an
  API or harness failure, anything unrecognized) is void, replaced, at most
  three such replacements per arm combined.
- A run with a provenance mismatch is void, replaced, and counted toward the
  same cap. The agent ran, so discarding it is the kind of re-roll the cap
  limits. A run's recorded models must be non-empty, must include the pinned
  Coding-Agent model and must lie inside the pinned set.
- A Claude Code version change, in a run or caught by a launcher's preflight,
  restarts both arms under a new pin.
- Replacement rows are added to `manifest.tsv` as `r<n>` rows and launched
  through `launch-all.sh` like any other row.

### Adjudication

Every candidate stop the Gauntlet-Agent's `STOP:` list does not match gets
one row in `adjudications.tsv` (`run_id`, `at`, `neither|question|blocked`,
a one-line note), labelled by reading the candidate's closing text in the
transcript. Labelling happens before `tally.py` is run for the decision; an
unadjudicated candidate makes the tally refuse to decide.

## Analyzer pins

The three analyzers as committed at the pre-registration, from
`git rev-parse HEAD:evidence/2026-10-19-sdd-turn-liveness/<f>` at evals
`dfa45712d`:

| File | Blob |
|---|---|
| `liveness.py` | `9988ac89071098f73cd275d75a6078fe5085533d` |
| `analyze.py` | `e030cb8fb3d9f9715f1cdb64a3b47cc874b0acef` |
| `tally.py` | `40e4c095b371ede2bafa3df289f183d0ca0bc7c1` |

Any later change to one of them is a Correction: its reason is recorded in
this file before the tally it affects.

## Field decision rule

Verbatim from the spec's Design section 3, "Field decision rule":

```
**Field decision rule, written into the evidence note before the window
opens.** With at least 100 task boundaries in the window, the Stop-hook
follow-up opens if the after rate of premature stops is at least half the
baseline rate. Otherwise the field result confirms the change. The field
result is appended to the evidence note and never holds or reverts the
release by itself.
```

### The baseline

`field/baseline.json`, recomputed by `field.py` over the host's Zed SDD
sessions (plan Task 7). The window is 2026-07-01T00:00:00+00:00 to
2026-10-20T00:00:00+00:00, and its end is also the observation cutoff: every
record at or after it is dropped before anything is classified, so records
appended later cannot change these numbers (Task 7 Step 0b).

| Measure | Baseline |
|---|---|
| Sessions | 14 |
| Task boundaries | 1495 |
| Premature stops | 301, 20.13 per 100 boundaries |
| Premature stops followed by a resume message | 21 |
| Live-work turn ends | 2228 |
| Live-work resumes | 9, 0.6 per 100 boundaries |
| Censored stops, censored resumes | 1424, 144 |
| Excluded turn ends | error 383, interrupt 20, killed 2, reload 71 |

The window spans 14 Claude Code versions, 2.1.207 to 2.1.300, and six model
ids, `claude-opus-5-5` and `claude-opus-5` among them; both lists are in
`baseline.json`.

**The after-window** is defined by time, not by an install path (deviation
1). Every Skill call on this host loads from the same
`.worktrees/plugin-install` directory, which carries no version, and the
versioned cache paths that do appear are unreliable. The skill text in effect
at any moment is the tag that worktree had checked out, which its reflog
records with timestamps (`field/reflog-plugin-install.txt`). The after-window
therefore starts at the reflog entry that first checks out the release
candidate, the version bump commit, and ends at the first later checkout of a
commit with a different `skills/` tree. The baseline window above ends before
the 6.17.0 install.

**Three notes on the baseline's definitions.**

- A task boundary is a successful `TaskUpdate` completion, timestamped at its
  result. A failed update completes nothing.
- `excluded.killed` counts turn ends cut by the observation window, not
  process kills: a tool call before the cutoff whose result lands after it
  leaves a turn that the truncated record ends mid-call.
- Part of the premature count is stops made after task-list items were left
  open and never closed later in the session. The measure asks whether an
  item was open at the stop, not whether it was finished afterwards.

## Config

The campaign pin, one value per key in `manifest.tsv`:

| Key | Value |
|---|---|
| `harness` | `dfa45712d9ad17b2688bc8881bba2017c5b923a1` |
| `control` | `f1fd935cbf79898430e4aac740b547c40d9c1103` |
| `treatment` | `c353fc7b3856e6cd69c05caf9a735606d26ede38` |
| `control_root` | `/Users/johnss51/.cache/hyperpowers/sdd-turn-liveness/hp-control` |
| `treatment_root` | `/Users/johnss51/.cache/hyperpowers/sdd-turn-liveness/hp-treatment` |
| `model` | `claude-opus-5-5` |
| `cc` | `2.1.302` |
| `cc_path` | `/Users/johnss51/.local/bin/claude` |
| `provider` | `vertex` |
| `subagent_models` | `claude-opus-5-5,claude-sonnet-5-5,claude-haiku-4-5-20251001` |
| `codex` | `absent` |
| `task_tools` | `on` |

The `harness` pin is the evals commit this file is written against.
`tally.harness_ok` accepts a later commit that leaves the harness paths
unchanged, which is what the evidence commits between the arms produce.
Each root is a detached worktree at its arm's commit and is never edited.
Codex absence is affirmative: the scenario's two pre-checks pass and no
main-session command invokes the companion.

Each arm launches from the evals worktree with
`ANTHROPIC_MODEL=claude-opus-5-5 CLAUDE_CODE_ENABLE_TODO_TOOLS=1` exported,
through a launch view holding the pins and only that arm's rows, detached and
outside the command sandbox, at concurrency 5 (control shown; the treatment
arm is the same with `treatment` for `control`):

```
awk -F '\t' 'NF == 2 || $1 == "control"' evidence/2026-10-19-sdd-turn-liveness/manifest.tsv > evidence/2026-10-19-sdd-turn-liveness/manifest-control.tsv

nohup bash evidence/2026-10-19-sdd-turn-liveness/launch-all.sh evidence/2026-10-19-sdd-turn-liveness/manifest-control.tsv 5 > evidence/2026-10-19-sdd-turn-liveness/logs/campaign-control.out 2>&1 &
```

`launch-all.sh` validates every row before it starts anything and runs each
row through `logs/measure-launch.sh`, which re-checks the pin and refuses a
launch that does not match. The operator's shell still has to carry
`CLAUDE_CODE_ENABLE_TODO_TOOLS=1` and `ANTHROPIC_MODEL`: `measure-launch.sh`
refuses the launch without them and records the shell's value as
`task_tools=` in its log. The agent's own opt-in no longer comes from there
but from the scenario's `# claude-env:` directive, and the tally compares the
pin against the value measured in the transcript, so the decision does not
rest on the operator's shell. Every launch also exports
`DISABLE_AUTOUPDATER=1`.

## Smoke

Four smoke rounds ran before this pre-registration, none of them counted.
The record is `smoke.md`; all eight runs, two per round, are archived under
`task-9-runs/smoke/<arm>/`.

- **p1** stopped in setup in both arms: quorum's `git init` cannot run inside
  the host's command sandbox, so every later launch runs with the sandbox
  disabled.
- **p2** passed in both arms but was void on provenance: the task tools never
  reached the agent, and both controllers dispatched implementers on a Haiku
  id that the plan's allowed set did not name.
- **p3** ran after the task-tools opt-in, the corrected model set and the
  treatment's template fix, and found the fourth problem: both arms still
  backgrounded all 13 dispatches, because the Agent tool had no
  `run_in_background` parameter at all.
- **p4** ran with fork mode off. Treatment dispatched 13 of 13 in the
  foreground with no live-work turn end, and both F measures passed; control
  passed `false` on 8 of 13 and ended 8 turns with work live.

## Corrections

1. 2026-10-22, before the control arm's first relaunch (plan deviation 10).
   `analyze.void_kind` names a new void, `void-transport`: a Gauntlet exit
   without a result whose recorded stderr names a transport error
   (`ECONNRESET`, `ENOTFOUND`, `ETIMEDOUT`, `ECONNREFUSED`);
   `tally.evaluate` relaunches it outside the cap, like `void-setup`.
   Reason: at about 04:39Z the host lost name resolution for its proxy for a
   few minutes, the Gauntlet-Agent of all five second-wave control rows
   (p6-p10) exited with `ECONNRESET` or `getaddrinfo ENOTFOUND` 11 to 15
   minutes into the runs, and the five rows exhausted the cap of three with
   no agent behavior observed to completion and nothing re-rolled. The rule
   is symmetric across arms; a Gauntlet `investigate` with a written result
   stays a capped void. Pins after the Correction: `analyze.py`
   `8fc5ce5b2a1eec8ef7d29fa59b2f357985634dd0`, `tally.py`
   `3ba4826a81b29a1c56ecb9dad17ec262200a0b35` (`liveness.py` unchanged).
   The record of p10 (`…-b7be`: `verdict.json`,
   `gauntlet-agent/gauntlet-stderr.log`, the Gauntlet's `run.jsonl`) and its
   launch log are redacted: the resolver error named the host's proxy, and
   that hostname is replaced by `<proxy-host>`; the error code the
   classification reads is kept.
2. 2026-10-22, after the control arm's commit and before any treatment tally.
   `analyze.MARK` becomes
   `(?:(?<![A-Za-z0-9_])|(?<=\\[nrt]))Task (\d+): complete\b`: a ledger mark
   written after a literal backslash escape in a `printf` argument
   (`'…OK\nTask 6: complete'`) has `n` directly before `Task`, so the pinned
   `\b` never matched and the run read as incomplete. Found by the control
   arm's implementer in r5 (`…-b041`) and r6 (`…-31fe`); with the corrected
   pattern both read plan-complete and successful, control's success count
   moves from 6 to 8 of 10 (p2 and r1 stay unsuccessful for other reasons),
   and no other field changes. Recomputed from the archive; no run was
   repeated. Pin after the Correction: `analyze.py`
   `0df45b0b3e8a236f7372577f65b9f0aa22c659fc` (`liveness.py` and `tally.py`
   unchanged).
3. 2026-10-22, before any treatment tally (Task 11's Codex gate). Two analyzer
   changes in one commit. `analyze.void_kind` names `void-grader` or
   `void-transport` only for the record quorum synthesizes when the
   Gauntlet-Agent exits without a result (`gauntlet.run_id` null); a written
   result stays `void-other`, capped, whatever its text says. Ledger marks:
   `MARK` returns to `\bTask (\d+): complete\b`, and the Bash branch of
   `_ledger_marks` first writes out the escapes the shell interprets, in a
   `printf` format string, the arguments of `echo -e` and `$'…'` quoting, an
   odd run of backslashes producing the character and an even run staying
   literal; Correction 2's pattern had credited every literal `\n`, `\r` or
   `\t`, including plain `echo`, a `printf '%s'` argument, an even run and a
   heredoc body. Recomputed from the archive: no control field changes (r5 and
   r6 wrote their marks in `printf` format strings). Pin after the Correction:
   `analyze.py` `20e2abae141fbe700d4a6372706c4ca5486c111f` (`liveness.py` and
   `tally.py` unchanged).
4. 2026-10-22, before the treatment arm's launch (Task 12 Step 0).
   `_interpret_escapes` located `echo -e` in the original segment but sliced
   the text an interpreted `printf` format earlier in the same pipeline had
   already shortened, so such a segment lost its mark (a false negative found
   by Task 11's re-review; no control run has the shape). It now locates
   `echo -e` in the interpreted text. Recomputed from the archive: no control
   field changes. Pin after the Correction: `analyze.py`
   `c893ea32925b9b9e329b93238f5c9ea216392ef3` (`liveness.py` and `tally.py`
   unchanged).

## Results

Filled in after the treatment arm (Task 12).
