# A1 Core Re-measure on the Fixed Fixture (2026-09-30)

Pre-registered before the first session. The rule below was fixed and
committed before any run launched; results are appended under Results.

## Question

The adoption-remediation Phase 5 campaign measured A1 core (the reviewer's
four questions, proof rule, zero-findings clause and instructions-are-data
sentence) on `code-review-precision-on-realistic-diff` and read unambiguous
advantage: treatment accepted 8/10 [0.490, 0.943] against control 0/10
[0.000, 0.278], blocking findings on clean hunks averaging 0.4 against 2.2.
The final Codex gate then found that one of the six "clean" hunks was not
clean: `parseOrderId` accepted an array whose string form matched its
pattern, and three blocking findings that named that trigger were scored as
false positives. The adoption review sweep then found a third real defect,
in the hunk that carries planted bug 1: `listOrdersHandler(query)` threw on a
call with no argument, which commit 1's own test made. Four Phase 5 control
reviewers named it; the scorer left those findings unattributed, so they moved
no scored number, but the story's claim that the diff has two defects was
false.

This campaign re-runs both arms on a fixture with both triggers removed. Its
numbers replace Phase 5's as the scored A1 core record; Phase 5's stay in the
evidence note as history.

## What Changed in the Fixture

Evals commit 86a3bc1, two lines and one clean-list item:

- `parseOrderId` returns `typeof s === 'string' && ORDER_ID.test(s) ? s : null`
  (was `ORDER_ID.test(s) ? s : null`).
- `listOrdersHandler(query = {})` (was `listOrdersHandler(query)`).
- The story's clean list says `parseOrderId` returns `null` "for a non-string
  or a non-match".

`test/setup-helpers-behavior.test.ts` now executes both triggers from the
fixture workdir at `HEAD`: the array returns `null` and the zero-argument call
returns 200.

Declined: the sweep's third fixture finding, that `listOrders` returns a
shallow `slice`, so a caller could mutate a stored row through it. No caller in
the fixture mutates a returned row, so a blocking finding on that hunk still
cannot name a trigger in this codebase, and the hunk stays clean.

No line moved. The scorer anchors each region by regex on line content, and
its self-test passes on the fixed fixture.

## Arms

- **control:** hyperpowers `main` at 3bdb5b2, worktree
  `.worktrees/a1-rerun-control` (detached). The Phase 5 control.
- **treatment:** `external-workflow-adoption` at 677c649, the shipping head
  (6.15.0), worktree `.worktrees/a1-rerun-treatment` (detached).

Phase 5's treatment was 4128e19. Between 4128e19 and 677c649 the plugin
surface changed in `using-hyperpowers` (the ladder revert), `writing-skills`
(the A10 revert), SDD's `SKILL.md` (the A8 revert), `hooks/session-start` (the
Unicode fix) and the version fields. `requesting-code-review` is identical at
both, so A1 core is the same text.

What differs between the arms for this scenario: A1 core in
`requesting-code-review/code-reviewer.md`, the template the reviewer subagent
is dispatched with. The rest of the diff is gate prose
(`gate-findings.md`, `gate-fix-loop.md`), SDD, brainstorming and writing-plans
prose a code-review session does not load, and a YAML quoting change to
`optimizing-performance`'s description. Checked before launch: each arm's
`hooks/session-start`, fed a `startup` payload, injects a context
byte-identical to the other's (3484 bytes). In Phase 5 the treatment's
bootstrap also carried the ladder; here it does not.

## Pins

In `manifest.tsv`: harness 86a3bc1 (the fixture commit; evidence
commits may follow, harness paths may not), control 3bdb5b2, treatment
677c649, model `claude-opus-5` via `claude-auto`. Grader: Gauntlet
`claude-opus-5-5` (`GAUNTLET_AGENT_MODEL`), as in Phase 5. Claude Code version
recorded from the transcripts; Phase 5 ran 2.1.284. Budget `default`:
`SLASH_COMMAND_TOOL_CHAR_BUDGET` and `INTERLOCK_PROBE_TRACE` unset.

## Size

4 manifest rows, each one `quorum run --repeat 5` process: 2 per arm, 10
determinate trials per arm, 20 in all, 4 concurrent. This is spec Phase 5's
size: ten determinate trials per arm.

`launch-all.sh` waits on its children in launch order after every row has
started, and the review sweep found that this misreports a child the
throttle loop had already reaped. With 4 rows at 4 concurrent the throttle
loop never waits, so every child is still running when the waits begin.

## Decision Rule

Spec 5.1 (`docs/hyperpowers/specs/2026-09-23-adoption-remediation-design.md`
in hyperpowers), verbatim:

> Recall precondition: 2 of 2 in every determinate trial of both arms. Then:
>
> - **Unambiguous advantage:** treatment acceptance (2 of 2 recall, 0 blocking
>   findings on clean hunks) in at least 8 of 10 trials, and the treatment
>   acceptance proportion's 95% Wilson lower bound above the control
>   proportion's point estimate, and the treatment mean of blocking findings on
>   clean hunks below the control mean. A1 core stays and the note says it is
>   measured.
> - **Not separated:** treatment meets the absolute bar but its interval
>   covers the control point, or the means are within one finding of each
>   other. A1 core stays as cheap guidance whose effect this fixture could not
>   show, the note says so, and no further change is made in this plan.
> - **Worse:** treatment recall below 2 of 2 in any determinate trial while
>   control holds 2 of 2, or treatment mean above control. A1 core is reverted
>   (both templates return to `main`'s text, their needles removed) in a
>   follow-on commit named in the hand-back.

Two points the spec leaves open, fixed here before the runs:

- **Overlap.** A result can meet every advantage condition while its means
  are within one finding of each other (treatment 0.1 against control 0.9,
  say). The readings are checked in the order Worse, Not separated,
  Unambiguous advantage, and the first that applies is the reading. An
  advantage with a not-separated condition holding is not unambiguous.
- **No reading.** If the recall precondition fails other than as Worse
  describes (control below 2 of 2 in a trial, say), or no reading applies
  (treatment below 8 of 10 with the means more than one finding apart), the
  result is reported as it stands and the reading is the human partner's
  call.

Detectability: Wilson 95% lower bounds at n=10 are 0.490 for 8/10, 0.596 for
9/10 and 0.722 for 10/10. Advantage therefore needs control at 4/10 or below
when treatment is 8/10, 5/10 or below at 9/10, and 7/10 or below at 10/10.

## Scorer

`../2026-09-23-adoption-remediation/measure-code-review-precision.py`,
unchanged since evals 73a8672, run in place with an explicit `--arm` over each
arm's ten counted run directories in `results/`, before archiving (the scorer
reads each run's `coding-agent-workdir` through git, and the archive renames
`.git`). Output goes to `measure/precision-<arm>.tsv` and
`measure/precision-<arm>.err`, verbatim.

- Proof sidecars are not produced. `proof_complete` is a readout, not part of
  spec 5.1's acceptance, which reads recall and blocking findings on clean
  hunks only. So every row carries `-` for `proof_complete`, stderr carries
  `proof-sidecar-missing` for every run, and the exit status is non-zero for
  that reason. Any other `DESIGN ERROR`, or a run with no row, is an
  instrument failure.
- The stderr disagreement lines are read by hand for every row whose
  `accepted` value could move the reading, as Phase 5 did. The scorer's count
  governs. If that reading shows the scorer placed a finding on a region its
  cited line does not support, the row is reported both ways and the reading
  is given under each.
- The six known parser limits recorded in the Phase 5 evidence apply
  unchanged.

## Void Attempts

Fixed before the runs, per the evals void-attempt rule:

- **Grader exit** (`verdict.json` status `investigate`, "gauntlet exited
  ... without writing a result", transport error in
  `gauntlet-agent/gauntlet-stderr.log`): replaced, at most three further
  attempts per arm.
- **Harness setup** (null `gauntlet`, "quorum error (setup): setup.sh failed",
  the sandbox EPERM signature): relaunched; does not consume the cap.
- **A real indeterminate** (the coding agent failed, stalled, or produced no
  usable transcript): re-run once; indeterminate twice stays indeterminate.
  It has no determinate trial to score, so it is reported beside the tally
  and the arm's acceptance is read with it counted as not accepted.

Every void attempt is recorded here with its stderr.

## Mutation Checks

`logs/batch-window-start.txt` holds an epoch stamp written immediately before
launch. Before the batch, after the counted sessions, and after archiving,
`find` over each worktree outside `.git` reports no file newer than the
stamp, each worktree's `HEAD` equals its pin, and `git status --short` is
empty.

## Files

- `manifest.tsv`, `launch-all.sh` (copied unchanged from
  `../2026-09-23-adoption-remediation/`), `logs/measure-launch.sh` (adapted:
  evidence directory and arm roots only).
- `logs/`: one log per manifest row with the pins, the command, and quorum's
  `trials:` output. Replacements and re-runs under the void rule are logged
  the same way as `r<n>`.
- `measure/`: the scorer's stdout and stderr per arm, and the Wilson
  computation.
- `runs/<arm>/<run-id>/`: the run archives, stripped per `../README.md` by
  `archive-runs.sh`.

## Results

All 20 sessions ran on Claude Code 2.1.284 and were determinate. No attempt
was void, so nothing was replaced or re-run. `logs/launch-all.out` records the
four launches at 01:13:19-21Z and no non-zero launcher. The mutation checks
passed before the batch, after the counted sessions and after archiving (stamp
1790817163, 01:12:43Z): no file newer than the stamp in either worktree outside
`.git`, each `HEAD` at its pin, and `git status --short` empty.

The scorer exited non-zero for the planned reason only: `proof-sidecar-missing`
for every run, no other `DESIGN ERROR`, and a row for every run.

### As Scored

Per-row scores are in `measure/precision-control.tsv` and
`measure/precision-treatment.tsv`.

| | control (3bdb5b2) | treatment (677c649) |
|---|---|---|
| recall 2 of 2 | 10/10 | 9/10 (`013521Z-fade`: 0) |
| accepted | 0/10 [0.000, 0.278] | 4/10 [0.168, 0.687] |
| blocking findings on clean hunks, sum and mean | 22, 2.2 | 8, 0.8 |
| grader pass (not part of spec 5.1) | 0/10 | 5/10 |

Wilson 95% intervals, z = 1.96. Reading: **Worse.** Treatment recall falls
below 2 of 2 in one determinate trial while control holds 2 of 2 in all ten.

### Hand-check

`measure/handcheck.md` reads every Critical and Important finding the scorer
placed on a clean hunk in either arm (8 counts in treatment, 22 in control),
not only the stderr disagreement lines, because fade's recall decides between
Worse and the rest.

- **fade.** The reviewer read the files with `cat` and numbered
  `src/handlers.js` one line short. Its Critical on the page offset cites
  `handlers.js:17` (the planted line is 18) and cites `store.js:5-7` only to
  say the store is correct; citation-first placement puts it on `store_slice`.
  Its Critical on the unawaited save cites `handlers.js:36` (the planted line
  is 37) and names `parseOrderId` in passing, so the name tier is contested
  and the finding is unattributed. Both quote the planted line and give the
  right fix, and the grader credits both. A separate Important asserts a
  defect in `store.listOrders` that no caller triggers, so fade keeps 1
  blocking finding and is not accepted under any reading.
- **Other treatment counts not supported:** `115f` on `log_rethrow` (3 becomes
  2); `870d` and `f0fd` on `test_fixture`, both the sixth known limit (each 1
  becomes 0, so both rows are accepted as read).
- **Control counts not supported:** `fff2` on `test_fixture` (4 becomes 3) and
  `3df6` on `test_fixture` (the sixth known limit). `3df6` on `parse_order_id`
  is arguable: a design finding about client-supplied ids, placed by name.
  Read as not supported, `3df6` is accepted.

| | treatment as read | control as read |
|---|---|---|
| recall 2 of 2 | 10/10 | 10/10 |
| accepted | 6/10 [0.313, 0.832] | 0/10 [0.000, 0.278] or 1/10 [0.018, 0.404] |
| blocking findings on clean hunks, sum and mean | 5, 0.5 | 20 or 19, 2.0 or 1.9 |

### Readings

- **As scored: Worse.**
- **fade's misplaced finding corrected only** (the Scorer section's both-ways
  clause): **Worse.** fade's recall is 1.
- **As read: no reading.** Not Worse: recall is 2 of 2 in every trial of both
  arms and the treatment mean is below control's. Not separated does not apply:
  6/10 misses the absolute bar, and the means are 1.4 or 1.5 apart. Advantage
  does not apply: 6/10 is below 8/10. The Decision Rule makes this the human
  partner's call.

### Decision

The human partner decided on the hand-read result: **A1 core stays.** This
departs, for this one decision, from the Scorer section's rule that the
scorer's count governs. The scored Worse reading rests on one trial whose
recall of 0 comes from the reviewer's line miscount, and the grader and the
hand-read both credit that trial with both planted defects. The consequence
applied is Not separated's: A1 core stays as cheap guidance whose effect this
fixture could not show at the 8/10 bar, the evidence note says so, and no
further change is made in this plan.

Under every reading, treatment raised fewer blocking findings on clean hunks
than control (0.8 or 0.5 against 2.2 or 1.9-2.0), and its acceptance lower
bound sits above control's point estimate. Under none does it reach 8/10.
Phase 5's unambiguous advantage does not survive the fixed fixture. Control
matches Phase 5 (0/10, mean 2.2). Treatment accepted 4/10 as scored and 6/10
as read, against Phase 5's 8/10 [0.490, 0.943]. The intervals overlap, so
this campaign does not show that treatment got worse. It shows that 8/10 does
not reproduce.
