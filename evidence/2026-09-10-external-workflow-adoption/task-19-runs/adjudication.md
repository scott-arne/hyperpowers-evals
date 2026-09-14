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

Revised in fix round 1 and again in fix round 2. Round 1 re-adjudicated S1 end
to end after the human partner's void-attempt ruling let the arm run a third
determinate trial, which flipped A1 from a no-ship on a failed Check 1 to a ship
on five passing checks, and it added the control run at the branch point that
this file previously said the `triggering-writing-plans` argument needed. Round 2
settled that sentinel finding on the human partner's decision to fix the
instrument: a fork gap in the harness and a mismatched check verb in the scenario
were both corrected and the scenario was re-run green at the same head. The
superseded S1 reasoning is in this file's history at commit `0edf098`; the
superseded "the finding stays open" reasoning is at `3aaf198`.

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
tier as regression" in the six contract-only Basis cells describe a tier run that
came back with one failure, not a clean sweep. The failure was
`triggering-writing-plans`, and it is now settled — the instrument was wrong
rather than the branch, both halves of it were fixed, and the scenario was re-run
green at the same head. What those Basis cells actually rest on is seven sentinel
scenarios green on the first pass, an eighth green on a re-run after its check was
corrected, one indeterminate on the actor-name limitation, and three that never
ran for the same limitation. That is sound support for the six rows. It is still
not the sentence "the tier came back clean", which it did not.

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

### Settled in fix round 2 — the instrument was wrong, and it is fixed

**The human partner's decision, 2026-09-13: fix the instrument.** That decision
is recorded here so a later reader sees a decision rather than a judgement call
made inside this file. Fix round 1 left the finding open and unaccepted and named
what would settle it; the decision came back to fix the apparatus; fix round 2
carried it out.

In one line: the tier failed `triggering-writing-plans`, the failure was two
defects in the measuring apparatus rather than a behavior change on the branch,
both were fixed, and the scenario was re-run at the same treatment head and
passed with the failing configuration reproduced.

#### What failed

The two non-green sentinel runs are preserved beside this file under
`sentinel-runs/`, cleaned by the same hygiene rule as the treatment arm, so the
citations below resolve from the repository rather than from the gitignored
`results/` tree. The seven green runs are cited only by the batch log line above
and are not copied.

From `sentinel-runs/triggering-writing-plans-claude-auto-20260913T215416Z-af50/verdict.json`:
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

The agent loaded `hyperpowers:brainstorming` first (tool call 1), wrote the design
document brainstorming tells it to write, and then loaded
`hyperpowers:writing-plans` (tool call 16). No implementation file was written
before the skill fired, which is what the scenario's acceptance criterion asks
and what the Gauntlet-Agent graded.

#### Why it was not a regression from the branch

The instruction that produces the pre-skill `Write` predates the branch. At the
branch point `f5a9843`, `skills/brainstorming/SKILL.md:293` already reads
"Write the validated design (spec) to `docs/hyperpowers/specs/YYYY-MM-DD-<topic>-design.md`".
The treatment's diff to that file is four added lines, all about how to phrase an
unconfirmed premise inside the spec; it does not change whether or when a spec is
written. The treatment's diff to `skills/writing-plans/SKILL.md` is 35 added
lines, all about the content of a plan — a Grounding section, `**Mirror:**`
citations, and the sanctioned-unknown syntax — and none of it changes what
triggers the skill or when it loads.

That reading is from the diff, so fix round 1 ran the control the argument
needed: one `triggering-writing-plans` at the branch point, `SUPERPOWERS_ROOT`
pointed at the baseline worktree, confirmed at
`f5a9843bc8c3e1ef3b7d7ec631a9f94605173e3e` before the run and preserved under
`sentinel-control/` with its tee'd runner log. It came back final `pass`, and it
settled nothing, because it passed vacuously. From that run's `verdict.json`:

- `skill-called superpowers:writing-plans` passed, detail "Skill(superpowers:writing-plans) called 1 time(s)".
- `skill-before-tool superpowers:writing-plans Edit` passed, detail "no Edit call — assertion is vacuous".
- `skill-before-tool superpowers:writing-plans Write` passed, detail "no Write call — assertion is vacuous".

The control agent wrote no file at all: six tool calls in 1m 04s —
`Skill(hyperpowers:writing-plans)` first, then `ls`/`git status`, two reads,
`node --version`, `npm install` — and the run ended. A check that never fired is
not evidence that the branch-point agent orders a real write after the skill, so
the control could not show non-regression; and the only writes on the treatment
side were the design spec, so it could not show regression either. Both arms'
Gauntlet-Agents passed the criterion. What the control did establish is the
mechanism: the branch changes which skill the agent reaches for first —
`writing-plans` at the branch point, `brainstorming` at the treatment head — and
brainstorming's own instruction to write a design document trips a check that
cannot tell a spec from implementation code. The behavioral difference is real.
The failure it produced belonged to the check.

#### The two defects, and the fix

Fix round 2 found two independent causes, both in the apparatus, and fixed both
in this repository.

- **A fork gap in the harness.** `src/detect/implementation.ts` excluded
  `^docs/superpowers/` from `EXCLUDED_RE` and not `^docs/hyperpowers/`. The fork
  made `src/detect/skill.ts` namespace-agnostic and stopped there, so under
  hyperpowers the spec that the brainstorming-to-plan pipeline is designed to
  write counted as implementation code. Fixed test-first: a twin of the existing
  superpowers-exclusion case was added to `test/implementation.detect.test.ts`
  and watched fail — `isImplementationPath` returned true for
  `docs/hyperpowers/specs/x.md` — before the fork's path was added to the
  alternation.
- **The scenario reached for the blunter of two verbs the harness already has.**
  `scenarios/triggering-writing-plans/checks.sh` asserted with
  `skill-before-tool`, which fires on any `Write` or `Edit`, while the scenario's
  own acceptance criterion is about implementation code and its three green
  sentinel siblings — `brainstorming-resists-jump-to-implementation`,
  `triggering-test-driven-development` and
  `triggering-finishing-a-development-branch` — all use
  `skill-before-implementation-tool` for this exact pattern. Both verbs take the
  same two arguments, so the change is those two lines and nothing else.

This is not a check weakened until a failure went away. It is one scenario
brought into line with its own written criterion and with its three green
siblings, plus a rename the fork left half-finished.

Widening the exclusion is a change to shared machinery, so its reach is recorded
here rather than left for someone to discover. Three verbs consult
`isImplementationPath`, and all three become strictly more permissive: the change
can turn a failing check into a passing one, or turn a substantive pass into a
vacuous one, and it cannot turn a passing check into a failure. Five other
scenarios use one of them:

- `skill-before-implementation-tool` — `brainstorming-resists-jump-to-implementation`,
  `triggering-test-driven-development`, `triggering-finishing-a-development-branch`.
  None of their tier runs can move. Both ordering checks were already vacuous in
  the first two, and the third passed on `package.json` and `test/utils.test.js`,
  neither of which is under a docs tree.
- `implementation-tool-not-called Write` — `worktree-creation-from-main`. This is
  the one that could plausibly change verdict. Its prompt asks the agent to start
  a login feature, which is the shape that sends this fork into brainstorming, and
  a design document written under `docs/hyperpowers/` currently fails the check.
  After the change it would not. The scenario is outside the sentinel tier and was
  not re-run in this round.
- `skill-before-mutation` — `code-review-of-a-committed-change`. Its agent mutates
  source files during fix-up, so a spec write is unlikely to be the first mutation,
  and the verb is monotone toward passing in any case. Not re-run.

#### The re-run

One run at the same treatment head `d0a187d64e62587131f9c9ff4f59988d257b6b26`,
same `claude-auto` actor, preserved under `sentinel-rerun/` with its tee'd runner
log: `triggering-writing-plans-claude-auto-20260914T055115Z-b9ab`. Final `pass`,
all three post-checks true. From its `verdict.json`:

- Gauntlet status "pass", summary "Claude Code, given the multi-step auth feature request, loaded hyperpowers:brainstorming, inspected the repo, wrote a design spec (docs only), then loaded the writing-plans skill — all before any implementation code was written."
- `skill-called superpowers:writing-plans` passed, detail "Skill(superpowers:writing-plans) called 1 time(s)".
- `skill-before-implementation-tool superpowers:writing-plans Edit` passed, detail "no implementation Edit call — assertion is vacuous".
- `skill-before-implementation-tool superpowers:writing-plans Write` passed, detail "no implementation Write call — assertion is vacuous".

The re-run matters because it reproduced the configuration that failed instead of
avoiding it. Its tool-call sequence, by index, read from the coding agent's
session transcript under that run's `home/.claude/projects/`:

1. `Skill` — `hyperpowers:brainstorming`
2. `Bash` — `ls -la && git log --oneline -5 && git status --short`
3. `Read` — `app.js`
4. `Read` — `package.json`
5. `Write` — `docs/hyperpowers/specs/2026-09-13-auth-poc-design.md`
6. `Write` — `.gitignore`
7. `Skill` — `hyperpowers:writing-plans`

A `Write` to the design spec at call 5, ordered before the `writing-plans` load
at call 7, is precisely the shape that failed in `af50`. Under the old verb that
call is a failing `Write` before the skill whatever its path; under the old regex
it is a failing implementation `Write` even with the new verb. Both halves of the
fix are load-bearing for this run. The agent behaved the same way it did before.
Only the reading of it changed.

#### Two kinds of vacuous, and they are not interchangeable

The control and the re-run both report their ordering checks as vacuous, and the
resemblance is misleading.

- The control's vacuity is empty. Nothing was written, so nothing was classified,
  and no part of the path under question was exercised.
- The re-run's vacuity is a result. Two files were written and both were
  classified as non-implementation: the design spec by the `docs/hyperpowers/`
  exclusion added in this round, and `.gitignore` by an exclusion that was
  already there. The classifier ran, on the exact input it used to misread, and
  got it right.

Only the second is evidence. Collapsing the two into one "passed vacuously" line
throws the result away.

#### What this settles, and what it does not

Settled: the tier failure was an instrument defect; it is fixed in the harness and
in the scenario; and the scenario passes at the treatment head with the failing
configuration reproduced. `triggering-writing-plans` is no longer an open
blocking finding under Step 7, and no acceptance of a known-bad result was
needed to close it.

Two limits survive, and this round repairs neither.

- **Still n=1 per arm.** A verb swap and a path exclusion change how a run is
  read; they do not add runs. One treatment run, one branch-point control and one
  re-run cannot separate a branch effect from ordinary variance — and the
  first-skill choice this section names as the mechanism is exactly the kind of
  thing that varies run to run. It rests on a single observation per side.
- **This scenario's ordering checks will be vacuous in nearly every run.** The
  story ends the operator's turn as soon as the agent loads a skill or starts
  planning, so an agent seldom reaches implementation code inside the run window;
  two of the three green siblings are vacuous for the same reason. The scenario's
  positive signal is `skill-called` plus the Gauntlet-Agent's judgement. The
  ordering checks are a guard against the bad case — an agent that writes code
  first — not a measurement of the good one. Three green checks on this scenario
  are not three independent confirmations, and should not be read as such.

`superpowers-bootstrap` is the `⊘`, and it is not a behavior result. From
`sentinel-runs/superpowers-bootstrap-claude-auto-20260913T215416Z-3e65/verdict.json`,
the `bootstrap-installed` pre-check failed with detail "unrecognized coding-agent: claude-auto",
so the run was indeterminate before the agent started. That check only recognizes
the literal `claude` actor, the same one that cannot provision here.

This sentinel tier measured `d0a187d`, and the table above requires no removal,
so `d0a187d` is the head the table's verdicts describe. The tier's one failure is
resolved in the harness and in the scenario rather than accepted, and the re-run
that closes it is at the same head. What stays unmeasured at this head is the `⊘`
and the three scenarios that never ran, all four for the same actor-name
limitation. Task 21 runs the tier again; whoever reads its result should read
this subsection first, and should expect `triggering-writing-plans` to pass,
because the harness and scenario changes that make it pass are committed in this
repository alongside this file.

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

Re-run in fix round 2 over the whole evidence directory, with the re-run's
artifacts now part of the corpus.

`treatment/measurements.md`: 49 quotes verified, 0 misses.
This file: 27 quotes verified, 0 misses.

Removals required: none
