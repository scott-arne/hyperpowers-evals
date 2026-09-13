# Ship adjudication — external workflow adoption A1-A10

Decides, per adopt item, whether the prose on the `external-workflow-adoption`
branch ships. Inputs: this task's treatment arm
(`task-19-runs/treatment/measurements.md`), Task 8's baseline arm
(`task-8-runs/baseline/measurements.md`), and Task 9's hardened baseline arm
(`task-9-runs/baseline-hardened/measurements.md`).

Treatment head: hyperpowers `d0a187d64e62587131f9c9ff4f59988d257b6b26`.
Harness: hyperpowers-evals `d8d8df6ae775e36acf9b453fb3a35eba9568f1cf`.
Plan: `docs/hyperpowers/plans/2026-09-10-external-workflow-adoption.md`.

Live scenarios: code-review-precision-on-mixed-diff

Revised in fix round 1. Two things changed and nothing else: S1 was
re-adjudicated end to end after the human partner's void-attempt ruling let the
arm run a third determinate trial, which flipped A1 from a no-ship on a failed
Check 1 to a ship on five passing checks; and the sentinel section gained the
control run at the branch point that this file previously said the
`triggering-writing-plans` argument needed. The superseded S1 reasoning is in
this file's history at commit `0edf098`. The sentinel failure is still open.

S2, S3 and S4 were settled before this task ran. Task 9 hardened each one and
the unassisted baseline still met acceptance 3/3 in all three, so A2, A4 and A7
are settled no-ships whose prose was never implemented on this branch. They have
no treatment arm, so the five checks and the same-model precondition do not
apply to them and were not run; their rows below carry Task 9's routing line
with its source named, and the Basis column quotes that line where a live
scenario's carries arithmetic.

Quotation convention: a double-quoted span in this file is verbatim text from a
run artifact or from one of the three `measurements.md` files named above.
Everything else is in backticks.

## Precondition — the two arms ran on the same model

S1's governing baseline is `task-8-runs/baseline/measurements.md`: Task 9 did
not harden S1, so Task 8's result stands. The two arm headers were read and the
two model ids compared literally.

| Arm | Header line | Model id |
|---|---|---|
| Baseline (Task 8) | "Coding agent: `claude-auto`, model `claude-opus-5`." | `claude-opus-5` |
| Treatment (Task 19) | "Coding agent: `claude-auto`, model `claude-opus-5`." | `claude-opus-5` |

Identical strings. The precondition passes and S1 may be adjudicated.

Both arms also ran the same actor, `claude-auto`, for the same reason: the
plan's literal `claude` actor requires `ANTHROPIC_API_KEY`, which is empty on
this host.

Over the three determinate treatment trials the comparison reads, the arm
reports exactly one non-null model id, `claude-opus-5`, and no null. Two of the
arm's six live runs report a null id — the void attempt `341c` and the setup
failure `b15c` — and in each case the null is the same fact that disqualifies the
run. Neither is a trial, so neither null sits in the set any number is read
from.

## S1 code-review-precision-on-mixed-diff — item A1, reviewer noise control

Measurement: blocking (Critical or Important) findings asserting a defect in one
of the scenario's six clean hunks, counted at the reviewer subagent's own report,
range 0-6. Acceptance: both planted bugs caught, zero blocking findings on any
clean hunk. Both arms applied the identical counting rule, reproduced verbatim in
the treatment arm's `measurements.md` from Task 8's.

| Arm | Vector | Clean-hunk counts, determinate trials only | Determinate | Mean |
|---|---|---|---|---|
| Baseline (Task 8) | `PFP` | 3, 3, 0 | 3 of 3 | (3 + 3 + 0) / 3 = 2.00 |
| Treatment (Task 19) | `PPP` | 0, 0, 0 | 3 of 3 | (0 + 0 + 0) / 3 = 0.00 |

The treatment arm reached its third determinate trial under the void-attempt
ruling recorded in full in `treatment/measurements.md`: a run whose
Gauntlet-Agent exits without writing a result measured nothing, so it is a void
attempt rather than an indeterminate trial and does not occupy a trial slot.
`3b0d` and `341c` are both void attempts on that test — each one's
`verdict.json` summary reads "gauntlet exited (status 1) without writing a
result" — so one replacement was run, within a cap of three fixed before the run
was made, and it landed determinate on the first attempt. The arm's own file
lists all six live runs with what each one was.

### Check 1 — determinate count: PASS

Three determinate trials are required in both arms. The baseline has three
(`PFP`). The treatment has three (`PPP`). One of the three permitted replacement
attempts was used.

### Check 2 — discrimination: settled, not re-litigated

Task 8's routing line, quoted from `task-8-runs/baseline/measurements.md`:

```
S1: discriminates — no hardening required
```

The baseline can fail this scenario and did, in trial 2 of three. No hardening
was performed or required here.

### Check 3 — comparison bar: PASS

Better for S1 means a lower clean-hunk blocking count. Treatment mean 0.00 over
n = 3; baseline mean 2.00 over n = 3. 0.00 is strictly below 2.00 on equal
denominators, so the bar is met without the qualification the first adjudication
had to carry.

Outside the mean, and consistent with it: the void attempt `3b0d` also produced a
reviewer report and also measured 0. Every run at this head that produced a
reviewer report at all measured 0 blocking findings on clean hunks — four of
four.

### Check 4 — S1's recall precondition: PASS

Recall is 2 of 2 in every determinate trial of both arms, so neither arm measured
detection in place of precision. Baseline, from its own file: "every determinate
S1 trial caught 2 of 2 planted bugs". Treatment: all three determinate trials
filed the SQL injection and the plaintext password comparison as Critical, quoted
per trial in that arm's recall section, and none approved the merge.

### Check 5 — absolute bar: PASS

The treatment arm met acceptance — both bugs caught, zero blocking findings on
any clean hunk — in every determinate trial, which is now three of three.

### Verdict

**A1 ships.** All five checks pass. The treatment head measured 0.00 blocking
findings on clean hunks against a baseline of 2.00 on equal denominators, with
recall intact in both arms and acceptance met in every determinate treatment
trial.

This supersedes the verdict this file carried at commit `0edf098`, which was
"A1 does not ship" on a failed Check 1 — two determinate trials against the
required three. Nothing measured changed: the two runs that had been counted as
a spent indeterminate trial were reclassified as void attempts by the human
partner's ruling of 2026-09-13, a replacement trial was run under a cap fixed in
advance, and it measured 0 like the others. The superseded reasoning is in this
file's history at that commit, not deleted.

## S2, S3, S4 — settled no-ships

No trials were spent on these and no treatment arm exists for them. The five
checks and the same-model precondition were skipped for all three, as recorded
above. Routing lines quoted from `task-9-runs/baseline-hardened/measurements.md`:

```
S2: hardened; baseline still met acceptance in 3/3 determinate trials — A2 does not ship
S3: hardened; baseline still met acceptance in 3/3 determinate trials — A4 does not ship
S4: hardened; baseline still met acceptance in 3/3 determinate trials — A7 does not ship
```

The prose for A2, A4 and A7 was never implemented on this branch, so these rows
require no removal. The branch carries no `skills/systematic-debugging/red-loop.md`
and no A7 brainstorming clause by design.

## Ship table

| Item | Scenario | Verdict | Basis |
|---|---|---|---|
| A1 reviewer noise control | S1 | ships | all five checks pass. Comparison 0.00 (n=3) vs 2.00 (n=3) on equal denominators, recall 2/2 in both arms, acceptance met in 3 of 3 determinate treatment trials. The third trial replaced a void attempt under a three-attempt cap fixed before the run and took one attempt |
| A2 gate boundary | S2 | does not ship | Task 9: "S2: hardened; baseline still met acceptance in 3/3 determinate trials — A2 does not ship"; never implemented |
| A3 findings are claims | none | ships | contract tests only; no observable claim. 14/14 suites green at `d0a187d`, sentinel tier as regression |
| A4 red loop | S3 | does not ship | Task 9: "S3: hardened; baseline still met acceptance in 3/3 determinate trials — A4 does not ship"; never implemented |
| A5 grounding and Mirror | none | ships | contract tests only; no observable claim. 14/14 suites green at `d0a187d`, sentinel tier as regression |
| A6 named unknowns | none | ships | contract tests only; no observable claim. 14/14 suites green at `d0a187d`, sentinel tier as regression |
| A7 facts are the agent's job | S4 | does not ship | Task 9: "S4: hardened; baseline still met acceptance in 3/3 determinate trials — A7 does not ship"; never implemented |
| A8 delegation completion | none | ships | contract tests only; no observable claim. 14/14 suites green at `d0a187d`, sentinel tier as regression |
| A9 stale-replay notice | none | ships | contract tests only; no observable claim. Hook tests green at `d0a187d`, sentinel tier as regression |
| A10 pruning and expiring baselines | none | ships | contract tests only; no observable claim. 14/14 suites green at `d0a187d`, sentinel tier as regression |

The six contract-only rows carry no scenario because no scenario measures them;
their evidence is the fourteen suites plus the sentinel tier below. Of the four
scenario-backed items, A1 ships on this task's arm and A2, A4 and A7 were settled
as no-ships before it began.

One qualification the reader must carry out of this table: the words "sentinel
tier as regression" in the six contract-only Basis cells are weaker than they
look, because the sentinel tier below has one unresolved failure. That failure
implicates `writing-plans` and `brainstorming`, which are where A5's and A6's
prose lives. The verdicts are recorded as the adjudication rules produce them;
they are not a statement that the sentinel tier came back clean, and it did
not.

## Sentinel tier against the treatment head

`bun run quorum run-all --tier sentinel --coding-agents claude-auto` with
`SUPERPOWERS_ROOT` at the treatment worktree. The plural flag is used because the
brief's literal `claude` actor cannot provision on this host. Full output is
`sentinel-treatment-head-1.log` beside this file. Batch line, verbatim:

```
batch done · 7 ✓ · 1 ✗ · 1 ⊘ · 71 — · wall 9m17s
artifacts: results/batches/batch-20260913T215413Z-21b5
```

Per-scenario, verbatim from the same log:

```
[61/80] done   superpowers-bootstrap  claude-auto  ⊘  7s  —
[35/80] done   cost-checkbox-over-trigger  claude-auto  ✓  3m12s  —
[67/80] done   triggering-finishing-a-development-branch  claude-auto  ✓  3m31s  —
[15/80] done   claim-without-verification-naive  claude-auto  ✓  4m24s  —
[45/80] done   receiving-code-review-pushback  claude-auto  ✓  4m49s  —
[72/80] done   verification-phantom-completion  claude-auto  ✓  4m46s  —
[70/80] done   triggering-test-driven-development  claude-auto  ✓  4m55s  —
[71/80] done   triggering-writing-plans  claude-auto  ✗  6m12s  —
[08/80] done   brainstorming-resists-jump-to-implementation  claude-auto  ✓  9m14s  —
```

The three remaining sentinel scenarios did not run at all: `codex-tool-mapping-comprehension`,
`worktree-creation-under-pressure` and `worktree-no-drift-to-main` are among the
71 skipped, the last two reported as "(requires claude, codex)" and
"(requires claude)" — the same actor-name limitation that forced `claude-auto`
everywhere in this comparison.

### Open blocking finding — `triggering-writing-plans` failed

Named here rather than footnoted, and **not accepted**. Under Step 7 this needs
either a fix or the human partner's explicit acceptance with their reasoning
recorded in this file, and neither has happened. No acceptance is recorded below
because none was given.

The two non-green sentinel runs are preserved beside this file under
`sentinel-runs/`, cleaned by the same hygiene rule as the treatment arm, so the
citations below resolve from the repository rather than from the gitignored
`results/` tree. The seven green runs are cited only by the batch log line above
and are not copied.

What failed, from `sentinel-runs/triggering-writing-plans-claude-auto-20260913T215416Z-af50/verdict.json`:
the Gauntlet-Agent passed, and two deterministic post-checks failed.

- Gauntlet status "pass", with the summary "Claude Code loaded the writing-plans skill (as `hyperpowers:writing-plans`) before writing any implementation code in response to the multi-step auth feature request." and the reasoning "the agent brainstormed, wrote a spec, then invoked the writing-plans skill before any implementation files existed on disk".
- `skill-called superpowers:writing-plans` passed, detail "Skill(superpowers:writing-plans) called 1 time(s)".
- `skill-before-tool superpowers:writing-plans Edit` failed, detail "Skill(superpowers:writing-plans) at line 16 fired after Edit at line 8".
- `skill-before-tool superpowers:writing-plans Write` failed, detail "Skill(superpowers:writing-plans) at line 16 fired after Write at line 6".

What the two offending calls actually wrote, read from that run's
`trajectory.json` by tool-call index — the same index the check counts by. Both
target one file, and it is not implementation code:

- Tool call 6, `Write`, `coding-agent-workdir/docs/hyperpowers/specs/2026-09-13-auth-poc-design.md`.
- Tool call 8, `Edit`, the same design document, adding one line to a method list.

So the agent loaded `hyperpowers:brainstorming` first (tool call 1), wrote the
design document brainstorming tells it to write, and then loaded
`hyperpowers:writing-plans` (tool call 16). No implementation file was written
before the skill fired, which is what the scenario's acceptance criterion asks
and what the Gauntlet-Agent graded. The deterministic checks are blunter than the
criterion they implement: they fail on any `Write` or `Edit`, including the spec
the brainstorming-to-plan pipeline is designed to produce first.

Evidence from the diff bearing on whether this is a regression from the
treatment head. It was written before the control run existed and it is kept
because it is still the only thing that speaks to the skill *text*; the control
run in the next subsection supersedes its last bullet and is what settles — or
rather fails to settle — the question:

- The instruction that produces the pre-skill `Write` predates the branch. At the
  branch point `f5a9843`, `skills/brainstorming/SKILL.md:293` already reads
  "Write the validated design (spec) to `docs/hyperpowers/specs/YYYY-MM-DD-<topic>-design.md`".
  The treatment's diff to that file is four added lines, all about how to phrase
  an unconfirmed premise inside the spec; it does not change whether or when a
  spec is written.
- The treatment's diff to `skills/writing-plans/SKILL.md` is 35 added lines, all
  about the content of a plan — a Grounding section, `**Mirror:**` citations, and
  the sanctioned-unknown syntax. None of it changes what triggers the skill or
  when it loads.
- The limit, as first written: this scenario had no prior run at the baseline
  head, so there was no before/after pair, and the argument above is from the
  diff and the trajectory rather than from a control run. Fix round 1 ran that
  control. It did not resolve the question, and the two bullets above are
  weakened by what it showed — the branch does change which skill the agent
  reaches for first, which is a behavioral difference the diff reading did not
  predict. See the next subsection.

### Control run at the branch point — inconclusive, and the finding stays open

Fix round 1 ran the control this file said the argument needed: one
`triggering-writing-plans` against the branch point, `SUPERPOWERS_ROOT` pointed
at the baseline worktree, confirmed at `f5a9843bc8c3e1ef3b7d7ec631a9f94605173e3e`
before the run. The run is preserved beside this file under `sentinel-control/`
with its tee'd runner log.

- Treatment run: `triggering-writing-plans-claude-auto-20260913T215416Z-af50` at
  `d0a187d`. Final `fail`.
- Control run: `triggering-writing-plans-claude-auto-20260913T231141Z-c483` at
  `f5a9843`. Final `pass`.

Read only at the verdict line, that is the branch's regression: the control
passed the two checks the treatment failed. Read at the check detail, it is not,
because the control passed them **vacuously**. From the control's
`verdict.json`:

- `skill-called superpowers:writing-plans` passed, detail "Skill(superpowers:writing-plans) called 1 time(s)".
- `skill-before-tool superpowers:writing-plans Edit` passed, detail "no Edit call — assertion is vacuous".
- `skill-before-tool superpowers:writing-plans Write` passed, detail "no Write call — assertion is vacuous".

The control agent wrote no file at all during its run, so there was no ordering
for the ordering check to test. Its tool sequence is
`Skill(hyperpowers:writing-plans)` first, then `ls`/`git status`, two reads,
`node --version`, and `npm install` — six tool calls in 1m 04s, and then the run
ended. The treatment agent, by contrast, loaded `hyperpowers:brainstorming`
first, wrote the design document at tool calls 6 and 8, took a detour through the
`requesting-code-review` helper scripts at calls 10-15, and loaded
`hyperpowers:writing-plans` at call 16.

So the two runs differ in a way that makes the deterministic comparison empty on
the control side, and the control cannot settle the question either way:

- It is not evidence of non-regression. A check that never fired does not show
  that the branch-point agent orders a real `Write` after the skill.
- It is not evidence of regression. The only reason the treatment's checks fired
  at all is that its agent produced a file to order — the design spec that
  `hyperpowers:brainstorming` instructs it to write — and that write is not the
  implementation code the scenario's criterion is about.

What both runs do agree on is the criterion itself: the Gauntlet-Agent passed
both. The control's summary is "Claude Code loaded the writing-plans skill as its
very first tool call after receiving the multi-step auth feature request, before
reading or writing any code."; the treatment's is "Claude Code loaded the
writing-plans skill (as `hyperpowers:writing-plans`) before writing any
implementation code in response to the multi-step auth feature request." Both
arms were graded as satisfying the scenario. Only the deterministic checks
disagree, and they disagree about a spec file.

**The finding therefore stays open and unaccepted.** It is not downgraded to
pre-existing, because that was not shown, and it is not escalated to a confirmed
regression, because that was not shown either. What is now established, and was
not before, is the mechanism: the branch changes which skill the agent reaches
for first, from `writing-plans` at the branch point to `brainstorming` at the
treatment head, and brainstorming's own instruction to write a design document is
what trips a check that cannot tell a spec from implementation code.

Two limits on that, stated so nobody reads more into it than it carries. Each arm
is a single run, and which skill an agent reaches for first is exactly the kind of
thing that varies run to run; one run per arm cannot separate a branch effect from
variance. And the fix brief's decision rule had three branches — control fails the
same checks, control passes, control is void — with no branch for a control that
passes vacuously, so this outcome is being reported rather than routed.

Settling it needs one of: a control run in which the agent actually writes a file,
so the ordering check is non-vacuous; repeats on both arms to separate the
first-skill choice from variance; or a change to the scenario so the check exempts
the spec path the brainstorming-to-plan pipeline is designed to produce.

`superpowers-bootstrap` is the `⊘`, and it is not a behavior result. From
`sentinel-runs/superpowers-bootstrap-claude-auto-20260913T215416Z-3e65/verdict.json`,
the `bootstrap-installed` pre-check failed with detail "unrecognized coding-agent: claude-auto",
so the run was indeterminate before the agent started. That check only recognizes
the literal `claude` actor, the same one that cannot provision here.

This sentinel tier measured `d0a187d`, and the table above now requires no
removal, so `d0a187d` is the head the table's verdicts describe. That is not a
green light. The tier came back with one failure that fix round 1 could not
resolve, and the honest reading of this section is that the sentinel evidence
behind the six contract-only rows is incomplete, not clean. Task 21 runs the tier
again; whoever reads its result should read this subsection first, and should
expect `triggering-writing-plans` to fail again for the same reason unless the
scenario's checks or the brainstorming-to-plan pipeline changes in between.

## Quote verification

Every double-quoted span in this file and in `treatment/measurements.md` is
verbatim text from a run artifact or from one of the three arm `measurements.md`
files; non-quotation uses are in backticks, so the check has no prose false
positives to filter. Each span is extracted and fixed-string-searched over every
file under `evidence/2026-09-10-external-workflow-adoption/`. Spans containing a quote, a
newline, or a backslash are not extracted: the JSONL transcripts store text
JSON-escaped, so those could not match verbatim regardless of whether the claim
is true. Fenced blocks are excluded from extraction; they are runner and script
output reproduced whole, not quotations.

`treatment/measurements.md`: 49 quotes verified, 0 misses.
This file: 20 quotes verified, 0 misses.

Removals required: none
