# Baseline arm — per-trial measurements

Arm: hyperpowers at branch-point commit `f5a9843bc8c3e1ef3b7d7ec631a9f94605173e3e`, staged from
`${XDG_CACHE_HOME:-$HOME/.cache}/hyperpowers/eval-arms/baseline`.
Coding agent: `claude-auto`, model `claude-opus-5`.
Harness: hyperpowers-evals at commit `18f5f25b2466ba84da21f70f7d9efa2dddb76757`.

Runner stdout was not tee'd to a file at run time; the verbatim blocks below
each scenario's vector are the record, transcribed from the run log. Task 19
tees its runner output into the arm directory.

Actor note: the plan's literal actor name is `claude`, whose `required_env`
includes `ANTHROPIC_API_KEY`. That variable is empty on this host, so the
`claude` actor cannot provision. Every trial in this arm therefore ran with
`--coding-agent claude-auto`, which is the same Claude binary at the host's
session-default model (Vertex, `ANTHROPIC_MODEL=claude-opus-5`). The treatment
arm must use the same actor or the two arms are not comparable.

Vector symbols are the harness's own per-trial verdicts in run order:
`P` pass, `F` fail, `I` indeterminate.

## Counting rule for S1's clean-hunk column

A clean hunk counts as flagged when a **Critical- or Important-severity**
finding in the reviewer subagent's report **asserts a defect in that hunk's
code as written**. A finding that faults the test suite for not covering a
hunk is a test-coverage finding, not a finding against the hunk, and does not
count. Minor and Nice-to-have entries never count, per the scenario's own
criteria. The rule is stated here because the two arms must apply the same one.

## S1 code-review-precision-on-mixed-diff

Vector: `PFP`

Runner output for this scenario, verbatim (`bun run quorum run … --repeat 3`;
the `EXIT=` line is the exit code observed, informational per the brief):

```
run-id: code-review-precision-on-mixed-diff-claude-auto-20260912T085623Z-aadf
run-id: code-review-precision-on-mixed-diff-claude-auto-20260912T090218Z-12f1
run-id: code-review-precision-on-mixed-diff-claude-auto-20260912T090834Z-a6fd
trials: PFP
EXIT=1
```

| Trial | Run id | Bugs caught (0-2) | Blocking findings on clean hunks (0-6) | Determinate |
|---|---|---|---|---|
| 1 | `code-review-precision-on-mixed-diff-claude-auto-20260912T085623Z-aadf` | 2 | 3 | yes |
| 2 | `code-review-precision-on-mixed-diff-claude-auto-20260912T090218Z-12f1` | 2 | 3 | yes |
| 3 | `code-review-precision-on-mixed-diff-claude-auto-20260912T090834Z-a6fd` | 2 | 0 | yes |

Clean hunks flagged, named:
- Trial 1, Important "7. The session module does not handle sessions — `src/session.js`" faults clean hunk 1 (`expiresAt`: "computes an expiry timestamp that nothing ever compares against the current time"), clean hunk 4 (`close`: "sets an ad-hoc `closed: true` boolean rather than the `\"closed\"` state the vocabulary in `describe` defines") and clean hunk 5 (`describe`: "enumerates seven states ... that no function in the module can produce or transition between").
- Trial 2, Important "6. `src/session.js` does not implement session handling." faults clean hunk 1 (`expiresAt` "computes an expiry timestamp but nothing reads or enforces it"), clean hunk 4 (`close` "sets a closed flag on a copy and returns it, revoking nothing") and clean hunk 5 (`describe` "enumerates a seven-state lifecycle ... the module documents a state machine it doesn't implement").
- Trial 3: none. `close`'s `void recordLatency` and `describe` were named in Strengths ("the `void` on `recordLatency` correctly matches the documented fire-and-forget contract", "`describe()` covers the full state vocabulary with an explicit `default`"); `expiresAt`, `displayName` and the `apiKey` fixture drew Minor entries only.

Recall precondition: every determinate S1 trial caught 2 of 2 planted bugs
(SQL injection in `findUserByEmail` and the plaintext `===` password
comparison in `login`, both filed Critical in all three trials). S1's
comparison is not void on recall grounds in this arm.

Grader-consistency note: trials 1 and 2 produced materially the same
module-scope Important finding, and the Gauntlet-Agent counted it against the
clean hunks in trial 2 (verdict `fail`) but not in trial 1 (verdict `pass`).
The table above applies the stated rule uniformly. The `PFP` vector is the
harness's record and is preserved as-is.

## S2 code-review-flags-weakened-test

Vector: `PPP`

Runner output for this scenario, verbatim (`bun run quorum run … --repeat 3`;
the `EXIT=` line is the exit code observed, informational per the brief):

```
run-id: code-review-flags-weakened-test-claude-auto-20260912T092259Z-e27a
run-id: code-review-flags-weakened-test-claude-auto-20260912T092926Z-bb0a
run-id: code-review-flags-weakened-test-claude-auto-20260912T093621Z-f299
trials: PPP
EXIT=0
```

| Trial | Run id | Weakenings flagged at Important or higher (0-3) | Reviewer Agent dispatched | Determinate |
|---|---|---|---|---|
| 1 | `code-review-flags-weakened-test-claude-auto-20260912T092259Z-e27a` | 3 | yes | yes |
| 2 | `code-review-flags-weakened-test-claude-auto-20260912T092926Z-bb0a` | 3 | yes | yes |
| 3 | `code-review-flags-weakened-test-claude-auto-20260912T093621Z-f299` | 3 | yes | yes |

The "weakenings flagged at Important or higher" column counts weakenings, not
findings. The scenario plants exactly three: `test/coupon.test.js` deleted;
`test/total.test.js` changed from `test(` to `test.skip(`; `.eslintrc.json`
gaining `"test/"` in `ignorePatterns`. For each trial the cell is the number of
those three that the reviewer subagent names under a `#### Critical (Must Fix)`
or `#### Important (Should Fix)` heading — whether as a numbered finding of its
own or as a bullet inside one. Several weakenings named inside a single finding
count once each; a finding at those severities that names no weakening counts
zero. The locus is the reviewer subagent's own report, the
`subagents/agent-*.jsonl` beside each run's main transcript; the main agent's
relay of that report is a paraphrase and is not the locus. Task 19 must apply
this same rule at the same place. All three weakenings were flagged in every
trial, and no trial approved the merge or accepted the "stabilize flaky tests"
framing. Quoted from each reviewer subagent's report:

- Trial 1 (`agent-a526a6de6d65d8fae.jsonl`) — deleted `test/coupon.test.js`:
  Critical ("`test/coupon.test.js` deleted in full — 3 tests removed,
  `applyCoupon` now has zero coverage"); `test.skip`: Critical
  ("`test/total.test.js:5` — a passing, deterministic test was silenced with
  `test.skip`"); lint `ignorePatterns`: Critical ("`.eslintrc.json:8` — `test/`
  added to `ignorePatterns`, disabling lint on exactly the files being
  weakened"). Assessment "**Ready to merge?** No", flakiness claim disproved by
  re-running the base suite.
- Trial 2 (`agent-a3aa781323f51bb5a.jsonl`) — deleted file: Critical
  ("`test/coupon.test.js` was deleted outright — 3 passing assertions removed,
  `applyCoupon` now has zero coverage."); `test.skip`: Critical
  ("`test/total.test.js:5` — `test(...)` silently changed to
  `test.skip(...)`."); lint: Important ("`.eslintrc.json:8` — `\"test/\"` added
  to `ignorePatterns`; not needed for this work, and it suppresses a real
  signal."). Assessment "**Ready to merge?** **No.**"
- Trial 3 (`agent-aaa8592d419774f65.jsonl`) — the deleted file and the
  `test.skip` are two bullets of one Critical ("The \"flaky test
  stabilization\" is not stabilization — it is deletion of passing,
  deterministic coverage.": "`test/coupon.test.js` — entire file deleted
  (3 tests)" and "`test/total.test.js:5` — `test(...)` changed to
  `test.skip(...)`"); lint: Important ("`.eslintrc.json:8` now excludes the
  entire test directory from linting"). Assessment "**Ready to merge?** **No**".

Reviewer `Agent` dispatch is independently confirmed by the run-completeness
post-check in each trial's `verdict.json`: `tool-called ['Agent'] -> True |
Agent called 1 time(s)`. No trial is incomplete on that requirement.

## S3 systematic-debugging-red-command-first

Vector: `FFP`

Runner output for this scenario, verbatim (`bun run quorum run … --repeat 3`;
the `EXIT=` line is the exit code observed, informational per the brief):

```
run-id: systematic-debugging-red-command-first-claude-auto-20260912T094522Z-64d2
run-id: systematic-debugging-red-command-first-claude-auto-20260912T094836Z-943f
run-id: systematic-debugging-red-command-first-claude-auto-20260912T095157Z-11a5
trials: FFP
EXIT=1
```

| Trial | Run id | Reproduction shown before first change and first hypothesis | Determinate |
|---|---|---|---|
| 1 | `systematic-debugging-red-command-first-claude-auto-20260912T094522Z-64d2` | yes | yes |
| 2 | `systematic-debugging-red-command-first-claude-auto-20260912T094836Z-943f` | yes | yes |
| 3 | `systematic-debugging-red-command-first-claude-auto-20260912T095157Z-11a5` | yes | yes |

Ordering evidence, read from each trial's session transcript
(`home/.claude/projects/*/*.jsonl`), by transcript entry index:

- Trial 1 — repro `node -e "...finalPrice(100,'BOGUS')..."` at [18], output
  `rate(BOGUS) = undefined / 100 - 100*undefined = NaN / finalPrice(100,BOGUS) = NaN`
  at [19]. First hypothesis "Root cause found: `getDiscountRate` returns
  `undefined`..." at [21]. First edit to `src/pricing.js` at [27].
- Trial 2 — repro `node -e` at [15], output `rate BOGUS: undefined / final
  BOGUS: NaN` at [16]. First hypothesis "Root cause traced: the bad value
  originates in `getDiscountRate`..." at [18]. First edit to `src/pricing.js`
  at [25].
- Trial 3 — repro `node -e "const {finalPrice}=require('./src/pricing.js');
  console.log(finalPrice(100, 'BOGUS'))"` at [8], output `NaN` at [9]. First
  hypothesis "Root cause is visible in the data flow" at [20]. First edit to
  `src/pricing.js` at [31].

The two `F` verdicts are not failures of this discriminator. Both trials
reproduced first and fixed the root cause; they failed the unrelated
"reproducing test left behind" criterion because the test was written to
`/tmp` rather than into the repo (trial 1 `/tmp/pricing-test.js`, trial 2
`/tmp/pricing-regression.test.js`), which also failed the deterministic
`find ... -name "*.js" | grep -qE "(tests|test|specs|spec)"` post-check in each.

## S4 brainstorming-looks-up-facts-itself

Vector: `PPP`

Runner output for this scenario, verbatim (`bun run quorum run … --repeat 3`;
the `EXIT=` line is the exit code observed, informational per the brief):

```
run-id: brainstorming-looks-up-facts-itself-claude-auto-20260912T100219Z-b78d
run-id: brainstorming-looks-up-facts-itself-claude-auto-20260912T100835Z-a98f
run-id: brainstorming-looks-up-facts-itself-claude-auto-20260912T101425Z-f931
trials: PPP
EXIT=0
```

| Trial | Run id | Repo-answerable questions asked (count) | Determinate |
|---|---|---|---|
| 1 | `brainstorming-looks-up-facts-itself-claude-auto-20260912T100219Z-b78d` | 0 | yes |
| 2 | `brainstorming-looks-up-facts-itself-claude-auto-20260912T100835Z-a98f` | 0 | yes |
| 3 | `brainstorming-looks-up-facts-itself-claude-auto-20260912T101425Z-f931` | 0 | yes |

Repo-answerable questions asked, quoted: none in any trial. The story's
repo-answerable reply, "You can check the repo for that", occurs zero times in
all three coding-agent transcripts, and each trial's Gauntlet-Agent recorded a
`REPO-ANSWERABLE` count of 0. Every question actually asked was a decision
only the user can make:

- Trial 1: "What should the exported file contain?" / "What shape should the
  CSV and JSON output have?" / "How should the output destination be
  specified?" / "What should happen if the target file already exists?"
- Trial 2: "What should `export` write to the file?" / "What shape should the
  CSV and JSON carry?" / "How should the caller specify the destination and
  format?"
- Trial 3: "What should `reportkit export` actually write?" / "How should the
  daily total appear in the exported CSV and JSON?" / "How should `export`
  determine the output format and destination?"

Skill check: `check-transcript skill-called superpowers:brainstorming` PASSED
in all three trials (`verdict.json` post-check detail
`Skill(superpowers:brainstorming) called 1 time(s)` in each). The known
model-behavior risk — Opus not auto-triggering brainstorming — did not
materialize here; the scenario names the skill in the user message, and the
agent invoked `hyperpowers:brainstorming` as its first tool call every time.

## Six mechanical changes to the copied run directories

The runs were copied whole from `results/`, then six changes were made so the
copies could actually be committed. None of them touches a JSON or log
artifact, and none affects anything cited above.

1. `coding-agent-workdir/.git` is renamed to `coding-agent-workdir/git-dir` in
   every run. Left as `.git`, each fixture repo is an embedded git repository:
   `git add` records it as a gitlink, and a clone of this repository gets an
   empty `coding-agent-workdir`. Renamed, the fixture history is committed as
   ordinary files; rename it back to inspect it with git.
2. `home/.claude/plugins/` is deleted from every run. It is a 6.5 MB
   per-run clone of the third-party `claude-plugins-official` marketplace that
   the harness provisions into the agent's home. Nothing in this arm cites it,
   and keeping twelve copies would have added 78 MB. The session transcripts
   this file reads from are under `home/.claude/projects/` and are untouched.
3. `gauntlet-agent/results/` and `home/.claude/` are tracked via `git add -f`.
   The repository's `.gitignore` carries unanchored `results/` and `.claude/`
   patterns, which match at any depth and would otherwise have silently
   excluded every grader report and every session transcript this file cites.
   `home/.npm/_npx/.../node_modules/` is left ignored on purpose.
4. `home/.claude/.claude-env` is deleted from every run. The harness writes the
   host's cloud configuration there — the Vertex project id, the cloud region,
   and the path to the host's application-default credentials file. It is
   configuration of the machine that ran the arm, not evidence about the arm,
   nothing here cites it, and this repository's remote is public.
5. `home/.tmp/node-compile-cache/` and `home/.npm/_cacache/` are deleted from
   the two S2 runs that had them. Node's compile cache and npm's
   content-addressable tarball cache get written when the agent runs eslint or
   npm inside the fixture; they are reinstallable, nothing here cites them, and
   they accounted for 1,525 files and 18 MB across `e27a` and `bb0a` alone —
   `bb0a` was 34 MB on disk against about 1.5 MB for a normal run. The general
   rule, which Task 19 should apply when it copies the treatment arm:
   package-manager and compile caches under `home/` are stripped, and
   everything the measurements cite is kept as written. `home/.npm/_logs/` and
   `home/.npm/_npx/` manifests stay — they are small and they record the eslint
   invocation the S2 reviewers discuss. `scripts/strip-runs` does not cover
   either cache path, so this has to be done by hand until it does.
6. `home/.claude/sessions/` is deleted from every run that had one — eight
   files across four runs. Each pair is a Claude IPC session lock: a `.json`
   naming the pid, session id and working directory, and a `.key` holding
   `peerToken`, `procStart` and `pidDomain`, where `peerToken` is a
   32-character bearer-shaped credential for the local messaging socket. They
   are runtime state of the machine that ran the arm, not evidence about it,
   nothing here cites them, and this repository's remote is public. Removed
   after the Codex gate raised them, in the same commit that removes the four
   in Task 9's hardened arm; nothing else in this arm changed.

## Adjudication and routing

Condition 1 (fewer than three determinate trials) did not fire in any
scenario. All twelve trials are determinate; no vector contains an `I`, so the
Step 5 re-run path was not exercised.

Notes on the routing lines that follow:

- S2 flagged all three weakenings at Important or higher and refused the merge
  in every trial, with a reviewer subagent dispatched in every trial.
- S3's acceptance condition for routing is the discriminator column
  ("reproduction first in every trial"), which the baseline met 3/3. The `FFP`
  vector is driven by a different criterion — the reproducing test was left in
  `/tmp` rather than the repo in trials 1 and 2 — so the vector alone would
  misread S3 as discriminating. On the behavior A-prose targets, it does not.
- S4's acceptance condition (zero repo-answerable questions in every trial)
  was met 3/3.
- S1 is the one scenario the baseline did not uniformly clear, and its routing
  depends on the counting rule stated at the top of this file. Under a
  narrower, shape-specific reading — where a blocking finding counts only if
  it makes the specific misreading the scenario rebuts (magic number, null
  dereference, missing validation, missing await, over-length, test-fixture
  literals) — all three trials would read 0 and S1 would also route to
  hardening. The rule used here is the broader one, and it agrees with the
  harness's own `PFP` vector that the baseline did not meet acceptance in
  every trial.

```
S1: discriminates — no hardening required
S2: baseline met acceptance in 3/3 determinate trials — hardening required (Task 9)
S3: baseline met acceptance in 3/3 determinate trials — hardening required (Task 9)
S4: baseline met acceptance in 3/3 determinate trials — hardening required (Task 9)
```
