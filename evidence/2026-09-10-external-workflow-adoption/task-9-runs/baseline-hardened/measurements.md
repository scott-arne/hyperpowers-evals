# Hardened baseline arm — per-trial measurements

Arm: hyperpowers at branch-point commit `f5a9843bc8c3e1ef3b7d7ec631a9f94605173e3e`, staged from
`${XDG_CACHE_HOME:-$HOME/.cache}/hyperpowers/eval-arms/baseline`.
Coding agent: `claude-auto`, model `claude-opus-5`.
Hardened fixture: hyperpowers-evals at commit `9f49c2b1ccfff1db0515ac06e1d37593f60053de`
(`test(scenarios): harden three scenarios so the baseline can fail`), which is
also the harness commit every trial ran on.
Plan: `docs/hyperpowers/plans/2026-09-10-external-workflow-adoption.md`.

This arm re-runs the unassisted baseline against the hardened fixture for the
three scenarios Task 8 routed to hardening. It supersedes
`task-8-runs/baseline/measurements.md` for exactly those three — S2, S3, and
S4. S1 was not hardened and is not re-run here; Task 8's S1 result stands.

Runner stdout was tee'd to a file at run time. The verbatim block under each
scenario's vector is that file, filtered to its `run-id:`, `trials:`, and
`EXIT=` lines; the unfiltered logs are `runner-<scenario>.log` beside this
file.

Actor note: the plan's literal actor name is `claude`, whose `required_env`
includes `ANTHROPIC_API_KEY`. That variable is empty on this host, so the
`claude` actor cannot provision. Every trial in this arm therefore ran with
`--coding-agent claude-auto`, the same actor Task 8's baseline arm used — the
same Claude binary at the host's session-default model (Vertex,
`ANTHROPIC_MODEL=claude-opus-5`). Task 8's arm and this one are comparable on
that axis, and a treatment arm must use the same actor again.

Vector symbols are the harness's own per-trial verdicts in run order:
`P` pass, `F` fail, `I` indeterminate. The `EXIT=` line is the runner's exit
code: 1 when a trial failed, 2 when a trial was indeterminate and none failed,
0 when all passed. It is reported for completeness; routing below is decided on
the discriminator column, not on the exit code.

Quotation convention: a double-quoted span in this file is verbatim text from a
run artifact. Column names, criterion names, and every other non-quotation use
are written in backticks instead, so the quote-verification pass described at
the end has no prose false positives to filter.

## Counting rule for S2's weakenings column

The `weakenings flagged at Important or higher` column counts weakenings, not
findings. The hardened scenario plants exactly four:

1. `test/coupon.test.js` deleted;
2. `test/total.test.js` changed from `test(` to `test.skip(`;
3. `test/total.test.js` summation assertion narrowed from
   `assert.equal(cartTotal([...]), 950)` to `assert.ok(cartTotal([...]) > 0)`
   — the weakening added by this task, and the only one with no marker to grep
   for: the test still runs and still passes, so a content diff is the sole
   witness;
4. `.eslintrc.json` gaining `test/` in `ignorePatterns`.

For each trial the cell is the number of those four that the reviewer subagent
names under a `#### Critical (Must Fix)` or `#### Important (Should Fix)`
heading — whether as a numbered finding of its own or as a bullet inside one.
Several weakenings named inside a single finding count once each; a finding at
those severities that names no weakening counts zero. The locus is the reviewer
subagent's own report, the
`home/.claude/projects/*/*/subagents/agent-*.jsonl` beside each run's main
transcript; the main agent's relay of that report is a paraphrase and is not
the locus. This is Task 8's rule with the fourth weakening added, applied at
the same place, so the two arms remain comparable.

## S2 code-review-flags-weakened-test

Vector: `PPP`

Runner output for this scenario, verbatim:

```
run-id: code-review-flags-weakened-test-claude-auto-20260912T173953Z-1d6b
run-id: code-review-flags-weakened-test-claude-auto-20260912T174610Z-c300
run-id: code-review-flags-weakened-test-claude-auto-20260912T175157Z-ae0e
trials: PPP
EXIT=0
```

| Trial | Run id | Weakenings flagged at Important or higher (0-4) | Reviewer Agent dispatched | Determinate |
|---|---|---|---|---|
| 1 | `code-review-flags-weakened-test-claude-auto-20260912T173953Z-1d6b` | 4 | yes | yes |
| 2 | `code-review-flags-weakened-test-claude-auto-20260912T174610Z-c300` | 4 | yes | yes |
| 3 | `code-review-flags-weakened-test-claude-auto-20260912T175157Z-ae0e` | 4 | yes | yes |

All four weakenings were flagged in every trial, and no trial approved the
merge or accepted the flaky-test framing. Quoted from each reviewer subagent's
report — the artifact each cell was read from is named with the quote, as a
path relative to that trial's run directory in the table above:

- Trial 1, `home/.claude/projects/*/*/subagents/agent-a58517da6555697af.jsonl`.
  All four sit under one `#### Critical (Must Fix)` heading and one
  `#### Important (Should Fix)` heading. Deleted file, Critical:
  "`test/coupon.test.js` — **deleted entirely** (all 15 lines, 3 tests)".
  Skip, Critical: "`test/total.test.js:5` — `test(` changed to `test.skip(`".
  Narrowed assertion, Critical: "`test/total.test.js:10-15` — `assert.equal(..., 950)` changed to `assert.ok(... > 0)`"
  with "This is not an equality check at all; it passes for 950, 951, 1, or 10000000."
  Lint, Important: "`.eslintrc.json:8` — lint silently disabled across the entire `test/` directory, in the same commit that weakens tests."
  Assessment: "**Ready to merge?** [Yes | No | With fixes]" is the skill's own
  report template, which appears earlier in the same transcript; the report's
  own answer is "**Ready to merge?** **No.**"
- Trial 2, `home/.claude/projects/*/*/subagents/agent-aceb209b3c2f78282.jsonl`.
  The three test weakenings are three separate Critical findings. Deleted file:
  "`test/coupon.test.js` was deleted, not stabilized — removes 100% of coverage on money-handling code".
  Narrowed assertion: "The surviving `cartTotal` assertion is tautological — `test/total.test.js:10-15`",
  with the disproof "a stub that just `return 1` → **passes**". Skip:
  "A passing deterministic test was skipped — `test/total.test.js:5`". Lint,
  Important: "ESLint silenced across the entire test directory — `.eslintrc.json:8`".
  Assessment: "**Ready to merge?** **No.**"
- Trial 3, `home/.claude/projects/*/*/subagents/agent-a66ca4e48911b5d95.jsonl`.
  The three test weakenings are three bullets of one Critical finding, and the
  lint change is Important. Deleted file:
  "**`test/coupon.test.js` — deleted entirely (3 tests).**" Skip:
  "**`test/total.test.js:5` — `test` changed to `test.skip`.**" Narrowed
  assertion: "weakened to `assert.ok(... > 0)`.** This is the most damaging single edit."
  Lint: "`.eslintrc.json:8` — `test/` added to `ignorePatterns`, unjustified by the stated intent."
  Assessment: "**Ready to merge?** No"

The fourth weakening is not merely counted — it was reasoned about. Trial 3
ranked it above the deleted file, and trials 1 and 2 each disproved it
constructively rather than by inspection: trial 1 by enumerating values the
assertion admits, trial 2 by naming two mutations that survive it.

Reviewer `Agent` dispatch is independently confirmed by the run-completeness
post-check in each trial's `verdict.json`, whose detail reads
"Agent called 1 time(s)" in all three. No trial is incomplete on that
requirement.

Independent corroboration of the count: each trial's Gauntlet-Agent, grading
from the same transcript but under the scenario's own criteria, reached the
same four. Trial 1's `gauntlet-agent/results/*/result.json` summary reads
"the reviewer flagged all four test-weakening changes (deleted coupon.test.js, test.skip, narrowed assertion, eslint ignorePatterns) at Critical/Important".

## S3 systematic-debugging-red-command-first

Vector: `PFF`

Runner output for this scenario, verbatim:

```
run-id: systematic-debugging-red-command-first-claude-auto-20260912T180136Z-d358
run-id: systematic-debugging-red-command-first-claude-auto-20260912T180515Z-6575
run-id: systematic-debugging-red-command-first-claude-auto-20260912T180925Z-5fbb
trials: PFF
EXIT=1
```

| Trial | Run id | Reproduction shown before first change and first hypothesis | Determinate |
|---|---|---|---|
| 1 | `systematic-debugging-red-command-first-claude-auto-20260912T180136Z-d358` | yes | yes |
| 2 | `systematic-debugging-red-command-first-claude-auto-20260912T180515Z-6575` | yes | yes |
| 3 | `systematic-debugging-red-command-first-claude-auto-20260912T180925Z-5fbb` | yes | yes |

The column is the graded binary, not the harness vector. It is read from two
artifacts per trial: the coding agent's own session transcript under
`home/.claude/projects/`, indexed by transcript entry, and the Gauntlet-Agent's
reasoning in `gauntlet-agent/results/*/result.md`. Both are named per trial
below.

One caveat on what this column proves. The scenario's `setup.sh` plants the
diagnosis in the source: `src/pricing.js` carries the comment `// Returns the
discount rate for a code. BUG: an unrecognized code is not in RATES, so this
returns undefined instead of "no discount".` — two `//` lines as written,
preserved pre-edit in each run under `home/.claude/file-history/` — and that is
the comment trial 3 names at [42] below. It predates this task: added with the
scenario in Task 6 at `8cbfcf5`, byte-identical at `7691388`, the evals commit
the hardening sits on, and neither introduced nor removed by the hardening.
Because the cause is handed to the agent, a `yes` here shows
reproduce-before-hypothesize even where no hypothesis had to be formed, so the
column proves less than its name suggests — and trial 1's Gauntlet-Agent filed
the leak as a fixture defect unprompted, in
`gauntlet-agent/results/*/issues/001-bug-fixture-leak-not-agent-behavior-src-p.md`:
"the cause is spelled out in the source the agent reads, weakening the test of independent diagnosis".
That cuts toward the no-ship rather than against it: the baseline cleared the
bar on the easier version of the task.

Ordering evidence, by transcript entry index:

- Trial 1, transcript `b65e13e8-5e61-4203-b34a-f4bab6dbb3b6.jsonl`. The user's
  receipt message is [7]; the skill loads at [15]. The agent constructs its own
  repro at [43], a `node -e` that requires `./src/checkout.js` and calls
  `receipt({ id: 8812, price: 100, code: 'BOGUS' })`; its output at [44] opens
  "Order 8812" and carries the reported "Total: $NaN". First hypothesis at [48]:
  "Reproduced. Traced to the source: `getDiscountRate` returns `undefined` for any code not in `RATES`".
  A reproducing test is written to `test/pricing.test.js` at [49] and run red at
  [57]. First edit to `src/pricing.js` at [62]. Repro output precedes both the
  hypothesis and the product-code edit.
- Trial 2, transcript `8efdc345-3686-406e-ac51-abad2c187275.jsonl`. User
  message [7]; repro `node -e` at [43]; output at [44]. First hypothesis at
  [48]: "Reproduced. Tracing backward from the symptom:". The reproducing
  script is written to `/tmp/pricing-repro.js` at [49] and run red at [57].
  First edit to `src/pricing.js` at [63].
- Trial 3, transcript `5ebc069c-e7b5-4467-b9b3-2fc7455e76da.jsonl`. User
  message [7]; at [42] the agent states its intent —
  "Let me reproduce it before trusting the comment in the source." — then runs
  the repro at [43], output at [44]. First hypothesis at [47]:
  "Reproduced. Backward trace to the origin of the bad value:". The reproducing
  script is written to `/tmp/pricing-regression.js` at [48] and run red at
  [57]. First edit to `src/pricing.js` at [63], and the script is deleted at
  [69].

Grader reasoning, from each trial's `gauntlet-agent/results/*/result.md`:

- Trial 1 (`..._20260912T180138Z_a6hj`): "reproduced the NaN receipt with a real `node -e` command before stating any theory",
  and the ordering is spelled out —
  "Session log shows the ordering: Skill load -> file reads -> `node -e` repro printing".
- Trial 2 (`..._20260912T180516Z_f18r`): "reproduced the NaN before any theory or edit, and fixed the root cause (RATES[code] ?? 0). But the reproducing test was written to /tmp/pricing-repro.js".
- Trial 3 (`..._20260912T180926Z_id05`): "reproduced the NaN receipt with a real command before theorizing".

The hardening did change what the agents had to do. Task 8's fixture handed the
agent a runnable command in the user message; the hardened story pastes a
receipt instead, and all three agents constructed a `node -e` against the new
`src/checkout.js` entry point rather than copying anything. The behavior the
scenario grades survived that change intact.

The two `F` verdicts are not failures of this discriminator. All three trials
reproduced first and fixed the root cause: the two root-cause `command-succeeds`
post-checks — the one requiring `getDiscountRate` to return `0` for `BOGUS`,
`ZZTOP`, and `NOPE99`, and the end-to-end one over the whole rate table — passed
in all three. Trials 2 and 3 failed the unrelated reproducing-test-left-behind
criterion because the test went to `/tmp` instead of into the repo, which also
failed the deterministic
`find ... -name "*.js" -print | grep -qE "(^|/|[-._])(tests|test|specs|spec)[-._/]"`
post-check in each — the scenario's `checks.sh:58`, with the `find` half elided
and the `grep` argument exact — with detail "exit non-zero". That is the same
`/tmp` pattern Task 8 saw in this scenario, and one failed post-check
downgrades the verdict on its own.

## S4 brainstorming-looks-up-facts-itself

Vector: `PPP`

Runner output for this scenario, verbatim:

```
run-id: brainstorming-looks-up-facts-itself-claude-auto-20260912T181722Z-e5d0
run-id: brainstorming-looks-up-facts-itself-claude-auto-20260912T182305Z-e5cd
run-id: brainstorming-looks-up-facts-itself-claude-auto-20260912T182840Z-604c
trials: PPP
EXIT=0
```

| Trial | Run id | Repo-answerable questions asked (count) | Determinate |
|---|---|---|---|
| 1 | `brainstorming-looks-up-facts-itself-claude-auto-20260912T181722Z-e5d0` | 0 | yes |
| 2 | `brainstorming-looks-up-facts-itself-claude-auto-20260912T182305Z-e5cd` | 0 | yes |
| 3 | `brainstorming-looks-up-facts-itself-claude-auto-20260912T182840Z-604c` | 0 | yes |

The column counts questions whose answer is written somewhere in the fixture —
the ones the story instructs the user to deflect. It is read from two artifacts
per trial. First, the coding agent's session transcript under
`home/.claude/projects/`: the story's deflection reply, which the
Gauntlet-Agent would have had to send for any such question, occurs zero times
in all three transcripts. Second, the Gauntlet-Agent's own
`gauntlet-agent/results/*/result.md`, which records whether it ever needed that
reply. Both agree on 0 for every trial.

Grader statements, per trial:

- Trial 1 (`..._20260912T181724Z_10de`): "all questions were genuine decisions (I never used the 'check the repo' reply)".
- Trial 2 (`..._20260912T182309Z_1f8o`): "no question required the 'check the repo' reply".
- Trial 3 (`..._20260912T182841Z_ac0x`): "zero repo-answerable questions".

### Questions the agents did ask

This sub-heading exists so the block below is not skim-read as the
repo-answerable list. Every question here is a decision only the user can make,
and none of them counts toward the column above. Read from each trial's
`AskUserQuestion` tool inputs, by transcript entry index:

- Trial 1, transcript `5c55dd58-0a28-4b74-97df-427cda55e2c3.jsonl` — four:
  [37] "What should `export` be able to write?";
  [51] "How should the export destination be specified?";
  [56] "What shape should the JSON export have?";
  [66] "How should `export` determine the output format?"
- Trial 2, transcript `42134cc4-3322-48a4-b3da-896328c3c3fc.jsonl` — four:
  [34] "What should the exported file contain?";
  [44] "How should the output destination be specified?";
  [49] "How should money be represented in the CSV and JSON output?";
  [54] "Should the exported files include the computed total?"
- Trial 3, transcript `5dda2147-3827-4501-9a31-57eb86bd7877.jsonl` — three:
  [36] "What should the exported file contain?";
  [46] "How should the export destination be specified?";
  [51] "How should amounts and the total be represented in the exported files?"

The hardening moved the storage and scheduling facts out of the README and into
`docs/adr/0002-storage-backend.md` and `deploy/crontab`, leaving the README
naming both locations without restating either. Those pointers were never
exercised. Each trial first enumerated the whole tree with `find` — trial 1 at
[26], trials 2 and 3 at [25] — and both relocated files were already listed by
name in that output, before the README had been read at all. Each trial then
read them in a single `cat` loop over
`pyproject.toml README.md deploy/crontab docs/adr/0002-storage-backend.md`,
trial 1 at [29], trial 2 at [29], trial 3 at [28], against first questions at
[37], [34], and [36] — so the README and the two relocated files arrived in the
same invocation and no agent paid an extra hop. Relocating the facts did not
produce a single question the user had to deflect. The honest reading is that
the hardening's mechanism was bypassed by whole-tree enumeration in 3/3 trials:
in a nine-file repository, moving a fact from one file to another cannot raise
the cost of finding it.

Skill check: the `skill-called superpowers:brainstorming` post-check passed in
all three trials, detail "Skill(superpowers:brainstorming) called 1 time(s)" in
each.

## Mechanical changes to the copied run directories

The nine runs were copied whole from `results/`, then the changes below were
made so the copies could be committed. They follow the rule Task 8's arm
established. None touches a JSON or log artifact, and none affects anything
cited above.

1. `coding-agent-workdir/.git` is renamed to `coding-agent-workdir/git-dir` in
   every run. Left as `.git`, each fixture repo is an embedded git repository:
   `git add` records it as a gitlink, and a clone of this repository gets an
   empty `coding-agent-workdir`. Renamed, the fixture history is committed as
   ordinary files; rename it back to inspect it with git.
2. `home/.claude/plugins/` is deleted from every run — a multi-megabyte per-run
   clone of the third-party plugin marketplace the harness provisions into the
   agent's home. Nothing here cites it. The session transcripts this file reads
   from are under `home/.claude/projects/` and are untouched.
3. `home/.claude/.claude-env` is deleted from every run. The harness writes the
   host's cloud configuration there — the Vertex project id, the cloud region,
   and the path to the host's application-default credentials file. It is
   configuration of the machine that ran the arm, not evidence about the arm,
   and this repository's remote is public.
4. `home/.local/share/claude`, `home/.cache/claude`,
   `home/.tmp/node-compile-cache/`, and `home/.npm/_cacache/` are removed where
   present: the CLI install, the CLI cache, Node's compile cache, and npm's
   content-addressable tarball cache. All are reinstallable and none is cited.
   `home/.npm/_logs/` and `home/.npm/_npx/` manifests stay — they are small and
   they record the eslint invocation the S2 reviewers discuss.
5. `gauntlet-agent/results/` and `home/.claude/` are staged with `git add -f`.
   The repository's `.gitignore` carries unanchored `results/` and `.claude/`
   patterns, which match at any depth and would otherwise have silently
   excluded every grader report and every session transcript this file cites.

## Quote verification

Every double-quoted span in this file is verbatim text from a run artifact in
this directory; non-quotation uses are written in backticks instead, so the
check below has no prose false positives to filter. The check extracts each
such span and greps the arm tree for it with `grep -rlF`. Spans containing a
quote, a newline, or a backslash are not extracted: the JSONL transcripts store
text JSON-escaped, so those could not match verbatim regardless of whether the
claim is true.

At the time of writing: 49 quotes verified, 0 misses.

## Adjudication and routing

Condition 1 (fewer than three determinate trials) did not fire in any scenario.
All nine trials are determinate; no vector contains an `I`, so the re-run path
was not exercised. The model-id check over this arm printed exactly one
non-null id, `claude-opus-5`, across all nine `verdict.json` files, so the arm
is one measurable population and is comparable to Task 8's baseline arm, which
reports the same id.

The adjudication rule is Task 8's: a scenario discriminates when the unassisted
baseline falls below the scenario's acceptance condition in at least one
determinate trial, measured on the discriminator column rather than on the
harness vector.

- S2's acceptance condition is that every planted weakening is flagged at
  Important or higher. The hardened fixture plants four instead of three, and
  the baseline flagged 4/4 in all three trials, dispatched a reviewer subagent
  in all three, and refused the merge in all three. The new fourth weakening
  was not a near miss: one trial called it the single most damaging edit in the
  commit, and two disproved it with constructed counter-examples.
- S3's acceptance condition is reproduction before the first change and the
  first hypothesis, which the baseline met 3/3. The `PFF` vector is driven by a
  different criterion — trials 2 and 3 left the reproducing test in `/tmp`
  rather than the repo — so the vector alone would misread S3 as
  discriminating. Routing is on the column, not the vector. The hardening did
  land its mechanical intent: with no command in the user message to copy, all
  three agents constructed their own `node -e` against the new
  `src/checkout.js`. The behavior survived it.
- S4's acceptance condition is zero repo-answerable questions in every trial,
  which the baseline met 3/3. Relocating the storage and scheduling facts out
  of the README changed nothing, and it cost no extra hop: all three agents
  enumerated the whole tree with `find` first, which listed the relocated files
  outright, then read the ADR and the crontab in the same `cat` loop as the
  README, before asking anything. The mechanism was bypassed rather than
  survived — in a nine-file repository there is no hop to add.

```
S2: hardened; baseline still met acceptance in 3/3 determinate trials — A2 does not ship
S3: hardened; baseline still met acceptance in 3/3 determinate trials — A4 does not ship
S4: hardened; baseline still met acceptance in 3/3 determinate trials — A7 does not ship
```

All three are no-ships, and their items go to the removal matrix. Per A10, a
change whose unassisted baseline already passes is a no-op; a second hardening
attempt would be a plan amendment, argued with these numbers.
