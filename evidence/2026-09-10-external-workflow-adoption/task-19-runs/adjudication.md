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

One qualification on the treatment side, carried forward from that arm's
model-id check. Three of the four copied runs report `claude-opus-5`; the fourth,
the Step 4 re-run `341c`, reports `null` because its coding-agent transcript
normalized to zero tool-call rows and the harness wrote no
`economics.coding_agent` block. Restricted to the two determinate trials the
comparison actually reads, the arm reports exactly one non-null id and no null.
`341c` contributes no measurement to anything below.

## S1 code-review-precision-on-mixed-diff — item A1, reviewer noise control

Measurement: blocking (Critical or Important) findings asserting a defect in one
of the scenario's six clean hunks, counted at the reviewer subagent's own report,
range 0-6. Acceptance: both planted bugs caught, zero blocking findings on any
clean hunk. Both arms applied the identical counting rule, reproduced verbatim in
the treatment arm's `measurements.md` from Task 8's.

| Arm | Vector | Clean-hunk counts, determinate trials only | Determinate | Mean |
|---|---|---|---|---|
| Baseline (Task 8) | `PFP` | 3, 3, 0 | 3 of 3 | (3 + 3 + 0) / 3 = 2.00 |
| Treatment (Task 19) | `PPI` | 0, 0 | 2 of 3 | (0 + 0) / 2 = 0.00 |

The treatment's third trial (`3b0d`) was indeterminate, was re-run once under
Step 4, and the re-run (`341c`) was indeterminate as well, so it stays `I` and is
excluded. Both indeterminate verdicts are Gauntlet-Agent transport failures —
"The socket connection was closed unexpectedly. For more information, pass `verbose: true` in the second argument to fetch()"
and "The operation timed out." — not coding-agent behavior and not the sandbox
`setup.sh` signature. The fixture built correctly in all four runs.

### Check 1 — determinate count: FAIL

At least three determinate trials are required in both arms. The baseline has
three. The treatment has two. The re-run budget is one per indeterminate trial
and it was spent, so the shortfall is recorded rather than resolved.

**This check decides the scenario.** Under the rule as written, fewer than three
determinate trials in either arm is insufficient evidence and the item does not
ship. The remaining checks are recorded because they were run, not because they
can carry a ship past this one.

### Check 2 — discrimination: settled, not re-litigated

Task 8's routing line, quoted from `task-8-runs/baseline/measurements.md`:

```
S1: discriminates — no hardening required
```

The baseline can fail this scenario and did, in trial 2 of three. No hardening
was performed or required here.

### Check 3 — comparison bar: PASS on arithmetic, unequal denominators

Better for S1 means a lower clean-hunk blocking count. Treatment mean 0.00 over a
denominator of 2; baseline mean 2.00 over a denominator of 3. 0.00 is strictly
below 2.00, so the bar is met on the trials that landed. The denominators differ,
which is the shortfall Check 1 names; the arithmetic is shown with both so the
comparison can be checked rather than taken.

For completeness, and outside the mean: the excluded trial `3b0d` also measured
0 blocking findings on clean hunks, from a reviewer report that is present in its
run directory. Every treatment run that produced a reviewer report at all
measured 0. That is context for the human partner, not a fourth trial.

### Check 4 — S1's recall precondition: PASS

Recall is 2 of 2 in every determinate trial of both arms, so neither arm measured
detection in place of precision. Baseline, from its own file: "every determinate
S1 trial caught 2 of 2 planted bugs". Treatment: both determinate trials filed
the SQL injection and the plaintext password comparison as Critical, quoted per
trial in that arm's recall section.

### Check 5 — absolute bar: PASS on 2 of the required 3 trials

The treatment arm met acceptance — both bugs caught, zero blocking findings on
any clean hunk — in every determinate trial it produced, which is two. It is not
possible to say it met acceptance in three, because there is no third.

### Verdict

A1 does not ship on this evidence: the treatment arm is one determinate trial
short of the bar, and insufficient evidence is a no-ship even when every
measurement that did land points the right way.

Worth stating plainly for whoever reads this next, because the shape of the
result is unusual: this is not a measurement that went against A1. The treatment
arm measured 0 blocking findings on clean hunks in all three runs that produced a
reviewer report, against a baseline mean of 2.00, with recall intact and the
comparison, recall and absolute bars all met. What failed is the trial count, and
it failed because the grader process died twice in a row on two different
transport errors. Re-running S1 to a third determinate trial would be a plan
amendment argued with these numbers, not a re-litigation of a verdict the
evidence settled.

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
| A1 reviewer noise control | S1 | does not ship | check 1: 2 determinate treatment trials against the required 3; the re-run was indeterminate too. Comparison 0.00 (n=2) vs 2.00 (n=3), recall 2/2 both arms, acceptance met 2/2 — all recorded, none sufficient without the third trial |
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
their evidence is the fourteen suites plus the sentinel tier below. The four
scenario-backed items are all no-ships, three of them settled before this task
began.

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

Evidence bearing on whether this is a regression from the treatment head, stated
with its limits:

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
- The limit: this scenario has no prior run in this clone's `results/` at the
  baseline head, so there is no before/after pair. The argument above is from the
  diff and the trajectory, not from a control run. Establishing non-regression
  properly means running `triggering-writing-plans` once against `f5a9843`, which
  is outside this task's run budget.

`superpowers-bootstrap` is the `⊘`, and it is not a behavior result. From
`sentinel-runs/superpowers-bootstrap-claude-auto-20260913T215416Z-3e65/verdict.json`,
the `bootstrap-installed` pre-check failed with detail "unrecognized coding-agent: claude-auto",
so the run was indeterminate before the agent started. That check only recognizes
the literal `claude` actor, the same one that cannot provision here.

This sentinel run measures `d0a187d`, and the table above requires a removal, so
`d0a187d` is not the head that ships. Task 21 runs the tier again against the
head that does; this result must not be read as a green light for that head.

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

`treatment/measurements.md`: 33 quotes verified, 0 misses.
This file: 17 quotes verified, 0 misses.

Removals required: A1
