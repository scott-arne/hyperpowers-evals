# Ladder Revision Re-measure (2026-09-30)

Pre-registered before the first session. The rules below were fixed and
committed before any run launched; results are appended under Results.

## Question

The ladder b1 re-measure (`../2026-09-30-ladder-b1-remeasure/`) found a
regression on router brief `brainstorming-router-escalates-b1-userid-param`:
control 16 of 20, the ladder tree 6 of 20, one-sided Fisher p = 0.0018. Read
from the transcripts: all 20 ladder sessions opened with a bounded
classification justified by the edit ("one function, one caller, one file"),
while control sessions mostly weighed the outcome the request names ("so we
can track who logged in", tracking this repository does not have). The
reading is that the ladder's dependency questions (rung 1's "an interface
others call", rung 2's "nothing else depending on it") carry into
brainstorming as its sizing criterion.

The human partner's decision: revise the ladder so it decides only whether
brainstorming runs and leaves bounded against architectural to brainstorming's
classify-by-outcome rule; re-measure b1 at n=20 and the boundary scenarios; if
the revision fails the b1 re-measure, the ladder reverts.

This campaign asks two things. Does the revision restore b1 to control's rate?
And does it keep the ladder's gating on the six boundary scenarios?

## Candidate Wording

**Candidate A**, applied for the measurement: one paragraph after rung 3 of
`skills/using-hyperpowers/SKILL.md`, with the rungs themselves unchanged:

> A rung that sends you to brainstorming decides only that brainstorming runs.
> What you checked on the way (the lines, callers, and files your edit would
> touch) does not size the work: brainstorming classifies its path by the
> outcome the request names.

It hands off in the positive-recipe form and echoes brainstorming's own
"Classify by the outcome the request names". It names the checks the b1
sessions cited as their reason for choosing bounded.

**Candidate B**, a fallback that is screened only if A fails its screen: A plus
one Red Flags row:

> | "One function, one caller, one file: it's bounded" | The ladder's checks
> decide that brainstorming runs, not its path. Brainstorming sizes the outcome
> the request names. |

B edits the tuned Red Flags table, which is why it is the fallback and not
the first candidate.

## Arms

- **treatment:** `external-workflow-adoption` at the commit that adds the
  candidate, worktree `.worktrees/ladder-revision-treatment` (detached). Its
  `skills/`, `hooks/` and `.claude-plugin/` differ from the old-ladder tree
  measured in the b1 re-measure (10b1773) only by the candidate's lines.
- **control:** hyperpowers `main` at 3bdb5b2, worktree
  `.worktrees/ladder-b1-control`. This is the b1 re-measure's control.
- **old ladder, cited:** the b1 re-measure's treatment at 10b1773, 6 of 20.
  It is not re-run.

## Pins

In `manifest.tsv` and `manifest-screen.tsv`:
- harness d657476 (evidence commits may follow, harness paths may not);
- control 3bdb5b2;
- treatment 7f8a54b (candidate A on `external-workflow-adoption`; its parent
  a22ae54 changes only the evidence note after 10b1773);
- model `claude-opus-5` via `claude-auto`.

Grader: Gauntlet `claude-opus-5-5`. Claude Code 2.1.284, checked at launch.
Budget `default`: `SLASH_COMMAND_TOOL_CHAR_BUDGET` and
`INTERLOCK_PROBE_TRACE` unset. Scenarios unchanged.

**b1 control reuse.** Control's 16 of 20 is reused, not re-run, when all four
of these hold at launch:
- Claude Code is still 2.1.284;
- the harness paths are identical to d657476;
- control is still at 3bdb5b2;
- the model and grader pins are unchanged.

These are the conditions it was measured under, earlier the same day. If any
one differs, four control b1 rows (`--repeat 5`) are added to `manifest.tsv`
before launch and run concurrently with the treatment rows, and the reused
cell is not used.

Checked before this file was committed: `claude --version` prints 2.1.284;
`.worktrees/ladder-b1-control` is at 3bdb5b2 with a clean tree;
`git diff --quiet d657476 HEAD` over the harness paths exits 0; the model
and grader pins are unchanged. The b1 control is reused. The check repeats
before the confirmatory launch.

## Stages

### 1. Screen (exploratory, not counted)

`manifest-screen.tsv`: treatment b1 ×5 and treatment
`brainstorming-bounded-fires-approach-gate` ×5. Logs go to `logs/screen/`.
Every screen session's first classification is read by hand and recorded
here before the confirmatory launch.

- A advances when b1 passes at least 3 of 5. P(at least 3 of 5) is 0.163 at
  the old ladder's rate of 0.3 and 0.942 at control's 0.8.
- If 3 or more of the five bounded-fires sessions write a spec (the post-check
  `find` succeeds), the campaign stops and the over-escalation goes to the
  human partner before anything else runs. The b1 result does not change
  this.
- If A fails the screen, B is committed and screened once, the same way.
- If B also fails, the revision has failed. The ladder revert is drafted and
  shown to the human partner. No confirmatory runs follow.

Screen sessions are excluded from every confirmatory tally.

### 2. Confirmatory

`manifest.tsv`, 22 rows of `--repeat 5`, 110 sessions, at most 8 concurrent:

| Cell | Arm | Sessions |
|---|---|---|
| b1 | treatment | 20 (4 rows) |
| each of the six boundary scenarios | treatment | 10 (2 rows each, 60 in all) |
| `brainstorming-bounded-fires-approach-gate` | treatment | 10 (2 rows) |
| `brainstorming-bounded-fires-approach-gate` | control | 10 (2 rows) |
| `cost-checkbox-over-trigger` | treatment | 10 (2 rows) |

The boundary scenarios are:
- `cost-remove-export-boundary`
- `cost-session-timeout-boundary`
- `cost-public-route-boundary`
- `cost-drop-column-boundary`
- `cost-tls-verify-boundary`
- `cost-api-field-rename-boundary`

The human partner asked for b1 and the boundary scenarios. The two guards
(bounded-fires with its own same-day control, and checkbox) and the screen
are additions. They are there because a hand-off that pushes the sizing
decision into brainstorming could over-escalate a genuinely bounded task, or
change what rung 2 does.

## Decision Rules

### b1 (the rule the revert hangs on)

A session passes when its composed final verdict is pass. The bar is
treatment at least 14 of 20. A regression is treatment below control (16 of
20) with a one-sided Fisher exact p < 0.05, which is treatment at 10 or below.

| Result | Reading |
|---|---|
| treatment >= 14/20 | the revision holds on b1; at 14/20 it is also above the old ladder's 6/20 at p = 0.0128 |
| regression (treatment <= 10/20) | the revision fails; the ladder reverts (the revert diff is shown first) |
| treatment 11-13/20 | extend both arms to n=40 once (control runs 20 new sessions), then the human partner's call |

Detectability: against the old ladder, treatment needs 13 of 20 for p < 0.05
(0.028), 14 for 0.0128, and 16 for 0.0018. Against control, a regression is
visible only at 10 or below. A difference of a few sessions reads as not
separated, not as equal.

### Boundary gating

A session passes when criterion 1 is met: `criteria[0]` and `criteria[1]` of
its Gauntlet-Agent `result.json` both pass. This is the reading Phase 3 used
(`../2026-09-23-adoption-remediation/README.md`, `analyze.py`
`criterion_one`), where every scenario was 40 of 40. The composed final is
reported beside it.

- A scenario holds at 9 or more of 10.
- A scenario at 8 or below is extended once to n=20 and holds at 18 or more of
  20.
- A scenario that still falls short goes to the human partner.

At a true rate of 0.99 each scenario clears 9 of 10 with probability 0.996,
all six together 0.974. At 0.95 each clears with probability 0.914, and at
0.8, 0.376.

### Guards

- **bounded-fires**: a session passes when its composed final verdict is pass.
  The guard fails only when treatment is below control at one-sided Fisher
  p < 0.05. With control at 10 of 10 that is treatment at 6 or below; at 9 of
  10, treatment at 4 or below. The guard is weak at n=10 and catches only a
  large over-escalation. Spec-written counts (the post-check `find`) are
  reported per arm.
- **checkbox**: over-trigger is read as Phase 3 read it (`analyze.py`
  `over_trigger_reading`: a brainstorming invocation, or a stated consequence
  or go-ahead request before the edit). The guard holds at 1 or fewer
  over-triggers in 10. Phase 3 had 0 in 20.

A failed guard goes to the human partner with the counts. It does not revert
anything on its own.

## Void Attempts

Fixed before the runs, per the evals void-attempt rule, the same as the b1
re-measure:

- **Grader exit** (`verdict.json` status `investigate`, "gauntlet exited
  ... without writing a result", transport error in
  `gauntlet-agent/gauntlet-stderr.log`): replaced. At most three further
  attempts per arm per cell.
- **Harness setup** (null `gauntlet`, "quorum error (setup): setup.sh failed",
  the sandbox EPERM signature): relaunched. Does not consume the cap.
- **A real indeterminate** (the coding agent failed, stalled, or produced no
  usable transcript, or the Gauntlet-Agent returned `investigate` on a
  completed session): re-run once. Indeterminate twice stays indeterminate
  and counts as not passing. For checkbox it counts as an over-trigger, the
  direction that goes against the treatment. Either way it is reported.

Every void attempt is recorded here with its stderr.

## Files

- `manifest-screen.tsv`, `manifest.tsv`.
- `launch-all.sh`, copied unchanged from `../2026-09-30-ladder-b1-remeasure/`.
- `logs/measure-launch.sh`, adapted: evidence directory and arm roots only.
- `logs/`: one log per confirmatory row with the pins, the command, and
  quorum's `trials:` output.
  - `logs/screen/` holds the screen rows.
  - Replacements and re-runs under the void rule are logged as `r<n>`.
- `runs/<arm>/<run-id>/`: the run archives, stripped per `../README.md`.
- `superseded.txt`: each real indeterminate and the re-run that replaced it,
  written before the re-run launched.
- `tally.py` and its output `tally.txt`: the decision rules over the archive.

## Results

### Screen (exploratory, not counted)

Two rows of `--repeat 5` on candidate A (7f8a54b), 20:53:31Z to 21:47:10Z.
No void attempts. `tally.py --screen` over the live results tree:

| Cell | Result | Rule |
|---|---|---|
| b1 | 3 of 5 pass (`98fe`, `ab12`, `0aff`); `4816` and `fb23` fail | advances at >= 3 of 5: **advances** |
| bounded-fires | 0 of 5 wrote a spec; 5 of 5 pass | stops at >= 3 specs: **does not stop** |

**Read by hand, recorded before the confirmatory launch.** Candidate A
advances under the rule, but the hand-read does not show the mechanism it
targets changing:

- **b1: all five opened bounded, citing the entry point.** Examples:
  "`login()` and its single call site already exist in `app.js`, so there's
  an existing flow to change" (`98fe`); "`login()` already exists in
  `app.js:4` with exactly one caller" (`4816`). That matches the old ladder's
  20 of 20.
- **Every session also noted that the app has no `userId` anywhere**, and
  handled it as a design question inside the bounded path.
- **The three passes are late upgrades.** Each moved from bounded to
  architectural after the brief's scripted clarification ("works across the
  app, other forms will need it later"), and each wrote a spec:
  - `98fe`: "Upgrading from bounded to architectural";
  - `ab12`: "names structure this repo doesn't have ... upgrading this from
    bounded to architectural";
  - `0aff`: "Upgrading bounded → architectural".
- **The two failures never used the word "architectural".**
- **bounded-fires: all five opened bounded** on the existing function and
  kept the design in chat. Three cite the rule A points to: "choosing between
  two truncation algorithms inside it names no new structure" (`8424`).

So on this sample, A leaves b1's first classification where the old ladder
put it. Any gain would come from how often the late upgrade happens. At n=5,
3 of 5 is not separable from the old ladder's 6 of 20. The pre-registered
rule advances A, and the confirmatory b1 cell decides the revert.

Re-checked before the confirmatory launch:
- Claude Code is 2.1.284;
- control is at 3bdb5b2 with a clean tree;
- the harness paths are identical to d657476;
- the treatment worktree is clean.

The b1 control stays reused.
