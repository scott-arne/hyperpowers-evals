# Treatment arm — per-trial measurements

Arm: hyperpowers at `d0a187d64e62587131f9c9ff4f59988d257b6b26` (the
`external-workflow-adoption` worktree head after Task 18 and every gate fix),
staged from
`/Users/johnss51/Development/agents/hyperpowers/.worktrees/external-workflow-adoption`.
The arm points `SUPERPOWERS_ROOT` at the feature worktree itself, not at a copy.
Coding agent: `claude-auto`, model `claude-opus-5`.
Harness: hyperpowers-evals at commit `d8d8df6ae775e36acf9b453fb3a35eba9568f1cf`.
Fixture: unhardened for S1. Task 9 hardened S2, S3 and S4 only, so this arm runs
Task 8's `code-review-precision-on-mixed-diff` unchanged and the clean-hunk range
stays 0-6. The harness commit clears Task 9's fixture floor:
`git merge-base --is-ancestor e074014 HEAD` printed `fixture ok` before the first
trial, recorded at the top of `runner-code-review-precision-on-mixed-diff.log`.
Plan: `docs/hyperpowers/plans/2026-09-10-external-workflow-adoption.md`.

Only S1 is measured here. Task 9 settled S2, S3 and S4 as no-ships — its
hardened baseline still met acceptance 3/3 in each — so this arm spent no trials
on them and carries no section for them. `adjudication.md` beside this file
copies their routing lines with their source named.

Runner stdout was tee'd to a file at run time. The verbatim block under the
scenario's vector is that file, filtered to its `run-id:`, `trials:`, and `EXIT=`
lines; the unfiltered log is `runner-code-review-precision-on-mixed-diff.log`
beside this file, and it also carries the Step 3 precondition output.

Actor note: the plan's literal actor name is `claude`, whose `required_env`
includes `ANTHROPIC_API_KEY`. That variable is empty on this host, so the
`claude` actor cannot provision. Every trial in this arm therefore ran with
`--coding-agent claude-auto`, the same actor both baseline arms used — the same
Claude binary at the host's session-default model (Vertex,
`ANTHROPIC_MODEL=claude-opus-5`). The two arms are comparable on that axis.

Vector symbols are the harness's own per-trial verdicts in run order: `P` pass,
`F` fail, `I` indeterminate, read from each run's `verdict.json` `final` field.
The `EXIT=` line is the runner's exit code: 1 when a trial failed, 2 when a trial
was indeterminate and none failed, 0 when all passed. It is reported for
completeness; nothing below is decided on it.

Quotation convention: a double-quoted span in this file is verbatim text from a
run artifact in this directory. Column names, criterion names, file paths, and
every other non-quotation use are written in backticks instead, so the
quote-verification pass described at the end has no prose false positives to
filter.

## The void-attempt rule

Decided by the human partner on 2026-09-13 and fixed before any replacement run
below was made. It is stated here in full because both arms are governed by it
and a later reader must be able to check this arm's denominator against it.

A run whose Gauntlet-Agent exited without writing a result measured nothing, so
it is a **void attempt, not an indeterminate trial**. It does not occupy a trial
slot and it is not evidence for or against the item. It is the reading this
project's plan-gate round ledger already applied to a lens killed at the harness
timeout, where the killed lens was recorded as a void attempt rather than a round
and consumed none of the round ceiling.

The distinction is narrow:

- **Void attempt** — the grader exited without writing a result: `verdict.json`
  `gauntlet.status` is `investigate` and its summary reads
  "gauntlet exited (status 1) without writing a result" — the status number is
  the grader's own exit code and varies — with the failure recorded in
  `gauntlet-agent/gauntlet-stderr.log`. The instrument failed. Re-run in its
  place.
- **Indeterminate trial** — anything else the harness cannot score, including
  every case where the coding agent itself failed, stalled, or produced no
  usable transcript. Step 4's rule is unchanged for these: one re-run, no more,
  and a second indeterminate stays `I` and is excluded from the mean.

Replacement runs are capped at **three further attempts**, and the cap is fixed
in advance precisely so a denominator cannot be reached by re-rolling: reach the
cap with fewer than three determinate trials and the arm stays short and says
so.

One boundary case is worth naming, because a reader applying the rule to `341c`
will hit it. That run carries both signatures — `gauntlet.status` `investigate`
with the void summary, and a `final_reason` of "Claude transcript(s) normalized
to zero tool-call rows", which is the coding-agent-side condition the second
bullet describes. The human partner classified this run void, and the
grader-exit signature is the one `gauntlet.status` records, so that reading
governs. It is worth noting that the two readings do not compete for an outcome
here: under the other one `341c` is an indeterminate trial excluded from the
mean, and the arm still holds the three determinate trials the bar asks for.

## Model-id check over this arm

Over the three determinate trials — the only runs any number below is read from:

```
code-review-precision-on-mixed-diff-claude-auto-20260913T212538Z-a249	claude-opus-5
code-review-precision-on-mixed-diff-claude-auto-20260913T213134Z-3014	claude-opus-5
code-review-precision-on-mixed-diff-claude-auto-20260913T230456Z-0eb0	claude-opus-5
distinct (determinate trials only): ['claude-opus-5'] | null present: False
```

Exactly one non-null model id and no null, which is what the rule asks for.

Over all six copied runs, including the two void attempts and the setup failure:

```
code-review-precision-on-mixed-diff-claude-auto-20260913T212538Z-a249	claude-opus-5
code-review-precision-on-mixed-diff-claude-auto-20260913T213134Z-3014	claude-opus-5
code-review-precision-on-mixed-diff-claude-auto-20260913T213753Z-3b0d	claude-opus-5
code-review-precision-on-mixed-diff-claude-auto-20260913T214539Z-341c	None
code-review-precision-on-mixed-diff-claude-auto-20260913T230325Z-b15c	None
code-review-precision-on-mixed-diff-claude-auto-20260913T230456Z-0eb0	claude-opus-5
distinct: ['claude-opus-5'] | null present: True
```

The two nulls belong to `341c` and `b15c`, and in each case the null is the same
fact that disqualifies the run: `341c`'s coding-agent transcript normalized to
zero tool-call rows, so the harness wrote no `economics.coding_agent` block, and
`b15c` never started an agent at all. Neither is a trial under the rule above, so
neither null sits in the set the comparison reads.

This supersedes the reading recorded before the void-attempt ruling, when `341c`
counted as trial 3 and its null therefore fell inside the trial set. Under that
earlier reading the rule wanted a further re-run that the then-current budget had
already spent; the ruling removes the collision rather than resolving it, because
a void attempt is not a trial whose id has to be checked.

## Counting rule for S1's clean-hunk column

A clean hunk counts as flagged when a **Critical- or Important-severity**
finding in the reviewer subagent's report **asserts a defect in that hunk's
code as written**. A finding that faults the test suite for not covering a
hunk is a test-coverage finding, not a finding against the hunk, and does not
count. Minor and Nice-to-have entries never count, per the scenario's own
criteria. The rule is stated here because the two arms must apply the same one.

This is Task 8's rule reproduced verbatim, applied at the same locus — the
reviewer subagent's own report, the `home/.claude/projects/*/*/subagents/agent-*.jsonl`
beside each run's main transcript. The main agent's relay of that report is a
paraphrase and is not the locus. The six clean hunks are the scenario's own
numbered list: 1 `expiresAt`'s bare `86400`; 2 `displayName`'s guarded
dereference; 3 `toMinutes`'s unvalidated argument; 4 `close`'s `void
recordLatency`; 5 `describe`'s long exhaustive switch; 6 the literals in
`test/session.test.js`.

## S1 code-review-precision-on-mixed-diff

Vector: `PPP` — the three determinate trials in run order. The void attempts
carry no symbol because they are not trials; they are listed under "Attempts"
below with what failed in each.

Runner output for the original three-trial invocation, verbatim:

```
run-id: code-review-precision-on-mixed-diff-claude-auto-20260913T212538Z-a249
run-id: code-review-precision-on-mixed-diff-claude-auto-20260913T213134Z-3014
run-id: code-review-precision-on-mixed-diff-claude-auto-20260913T213753Z-3b0d
trials: PPI
EXIT=2
```

That `trials:` line is the harness's own symbols at the time the runner printed
them, before the void-attempt ruling was applied; its `I` is `3b0d`, reclassified
above. It is reproduced unedited because it is the runner's output, not a
measurement.

The two runs made in its place, verbatim from the same log. A single
`quorum run` with no `--repeat` prints no `trials:` line; the run's verdict is
its `run-dir` block.

```
run-id: code-review-precision-on-mixed-diff-claude-auto-20260913T214539Z-341c
EXIT=2
```

```
run-id: code-review-precision-on-mixed-diff-claude-auto-20260913T230456Z-0eb0
EXIT=0
```

### Attempts

Six live S1 runs were made against this head in total. Three are trials; three
measured nothing.

| Run | Run id | Classification | Occupies a trial slot |
|---|---|---|---|
| 1 | `...20260913T212538Z-a249` | determinate trial, `pass` | yes |
| 2 | `...20260913T213134Z-3014` | determinate trial, `pass` | yes |
| 3 | `...20260913T213753Z-3b0d` | void attempt | no |
| 4 | `...20260913T214539Z-341c` | void attempt | no |
| 5 | `...20260913T230325Z-b15c` | setup failure; neither agent ran | no |
| 6 | `...20260913T230456Z-0eb0` | determinate trial, `pass` | yes |

Both void attempts carry the signature the rule names. Each one's
`verdict.json` `gauntlet.summary` reads "gauntlet exited (status 1) without
writing a result", `gauntlet.run_id` is null, and the cause is in the run's
`gauntlet-agent/gauntlet-stderr.log`:

- `3b0d` — "The socket connection was closed unexpectedly. For more information, pass `verbose: true` in the second argument to fetch()".
  The coding agent had finished: both post-checks passed and the reviewer
  subagent's report is present in the run directory.
- `341c` — "The operation timed out.", with `verdict.json` `final_reason`
  "Claude transcript(s) normalized to zero tool-call rows". This run has no
  `subagents/` directory and no reviewer report.

Run 5, `b15c`, is neither a trial nor a void attempt, and it is recorded here
rather than quietly dropped because it is the one run whose exclusion a reader
could otherwise mistake for re-rolling. Its `verdict.json` reason is
"quorum error (setup): setup.sh failed (exit 1)", and its stderr names the cause:
`git init -b main` failed with "Operation not permitted" copying a git template
hook into the fixture workdir. That is the operator's Bash sandbox denying a
write, not the harness and not either agent — the run had no coding agent, no
Gauntlet-Agent, no fixture, and no `home/` or workdir content at all, which is
why its census row below is empty. It was re-invoked immediately with the
sandbox off, which is the condition the arm's other five runs were made under;
none of them could have passed its `git-repo` pre-check otherwise. It is
preserved in this directory so that claim can be checked, and it is not counted
against the three-attempt cap because it made no attempt to measure anything.

**One of the three permitted attempts was used.** It produced a determinate
trial, so attempts 2 and 3 were not run.

### Determinate set and arithmetic

| Trial | Run id | Bugs caught (0-2) | Blocking findings on clean hunks (0-6) | Determinate |
|---|---|---|---|---|
| 1 | `code-review-precision-on-mixed-diff-claude-auto-20260913T212538Z-a249` | 2 | 0 | yes |
| 2 | `code-review-precision-on-mixed-diff-claude-auto-20260913T213134Z-3014` | 2 | 0 | yes |
| 3 | `code-review-precision-on-mixed-diff-claude-auto-20260913T230456Z-0eb0` | 2 | 0 | yes |

Mean blocking findings on clean hunks: (0 + 0 + 0) / 3 = 0.00, n = 3.
Recall: 2 of 2 in each of the three, so the mean measures precision and not a
reviewer that stopped finding things.

The `Determinate` column is each run's `verdict.json` `final` field, `pass` in
all three. The excluded `3b0d` also produced a reviewer report and also measured
0; it is reported under "Clean hunks flagged, named" for completeness and is not
in the mean.

### Clean hunks flagged, named

- Trial 1: none. Artifact:
  `home/.claude/projects/*/*/subagents/agent-a22c922c797468adf.jsonl`. The report
  carries two Critical and two Important findings and none of the four asserts a
  defect in a clean hunk. The two Criticals are the planted bugs. The two
  Importants are "Input validation removed, changing `findUserByEmail`'s external behavior — `src/db.js:5-6`",
  which faults the deleted guard in `src/db.js` — the defect hunk, not one of the
  six — and "No test covers the `src/db.js` change — `test/` contains only `session.test.js`",
  which is a test-coverage finding and excluded by the rule above on that ground
  as well as by its target. Four of the six clean hunks were instead named in
  Strengths: `displayName` "guards both the null-session and missing-user cases before dereferencing, which is the right shape for a render helper";
  `close` "does the right thing twice" because "it treats telemetry as fire-and-forget with an explicit `void` marker";
  `describe`'s exhaustive switch "has a `default` arm so an unknown state degrades to";
  `elapsedMinutes` "validates its input with a precise error message", which is
  the guard that makes hunk 3's `toMinutes` correct. `describe` and the test
  fixture drew Minor entries only — "`describe` import shadows the `node:test` global — `test/session.test.js:3`"
  and "Test coverage of `session.js` is illustrative rather than complete — `test/session.test.js`".
- Trial 2: none. Artifact:
  `home/.claude/projects/*/*/subagents/agent-a8ea5c0f9d7c7a91f.jsonl`. Two
  Criticals, both planted bugs, and one Important —
  "No test covers `src/db.js`, and the security properties it lost are exactly the testable ones — `test/` (absent)",
  a test-coverage finding against `src/db.js`. Clean hunks 2, 4 and 5 were named
  in Strengths: "`void recordLatency(...)` in `close` (session.js:26) is correct, not a bug.",
  "`displayName` guards both `!session` and `!session.user`", and
  "`describe` is an exhaustive switch with a `default` fallback". The two hunks
  that drew any comment at all drew Minor entries —
  "`close` is exported but untested — `src/session.js:25-28`, `test/session.test.js`"
  and "`displayName` returns `undefined` for a user without a `displayName` — `src/session.js:12`"
  — which the rule excludes.
- Trial 3: none. Artifact:
  `home/.claude/projects/*/*/subagents/agent-ade1eb6002d0594e2.jsonl`. Five
  blocking findings, and every one of them lands off the six clean hunks. The two
  Criticals are the planted bugs. The three Importants are
  "3. Input validation guard deleted from `findUserByEmail` — src/db.js:5-6",
  against the defect hunk;
  "4. Zero test coverage for the code that actually changed — test/session.test.js",
  a test-coverage finding, which the rule excludes by its own terms and which
  faults the suite rather than the fixture's literals; and
  "5. `src/crypto.js` is now dead code", which is not one of the six hunks at all
  — `src/crypto.js` is unchanged in the diff, and the finding is a consequence of
  the planted `src/db.js` defect having removed its only caller. Three clean hunks
  were named in Strengths: "`elapsedMinutes` (src/session.js:18-23) validates its input properly with `Number.isFinite` rather than a loose truthiness check" (hunk 3),
  "The detached telemetry call is handled correctly." (hunk 4), and
  "`describe`'s exhaustive switch (src/session.js:30-48) has a `default` arm" (hunk 5).
  The only two entries touching a clean hunk are Minor —
  "6. `displayName` guards the container but not the field — src/session.js:7-12"
  and "7. Local `describe` shadows the `node:test` export — test/session.test.js:3"
  — which the rule excludes.
- Void attempt `3b0d` (not a trial, not in the mean): none. Artifact:
  `home/.claude/projects/*/*/subagents/agent-a1cf27b6ee0f81b72.jsonl`. Two
  Criticals, both planted bugs, and two Importants —
  "Input validation guard deleted — `src/db.js:5-6`" and
  "No test covers `src/db.js` — `test/session.test.js`" — both against
  `src/db.js`, the second a test-coverage finding. Clean hunk 4 was named in
  Strengths: "`close` (src/session.js:26) correctly uses `void` on the detached telemetry call".
  Hunk 4 and hunk 5 drew Minor entries only, under "Thin coverage of the new module."
- Void attempt `341c` and setup failure `b15c`: not measurable. Neither run
  directory contains a reviewer subagent report to apply the rule to.

### Recall precondition

Every determinate S1 trial in this arm caught 2 of 2 planted bugs, both filed
Critical, so the comparison is not void on recall grounds on this arm's side.
Read from the same reviewer-report artifact named per trial above:

- Trial 1 — "SQL injection: parameterized query replaced with string concatenation" and "Password verification downgraded from scrypt hash to plaintext equality", both under "#### Critical (Must Fix)".
- Trial 2 — "SQL injection: parameterized query replaced with string concatenation" and "Password verification downgraded from hashed comparison to plaintext equality", both Critical.
- Trial 3 — "1. SQL injection introduced in `findUserByEmail` — src/db.js:6-10" and "2. Password hashing removed; plaintext comparison against a column that does not exist — src/db.js:7 and src/db.js:15", both under "#### Critical (Must Fix)".
- Void attempt `3b0d` (not a trial) — "SQL injection — `src/db.js:6-10`" and "Plaintext password comparison — `src/db.js:7 and 15`", both Critical.

No trial approved the merge. Each determinate report's assessment reads
"**Ready to merge?** No." (trial 1), "**Ready to merge?** No" (trial 2) and
"**Ready to merge?** No" (trial 3); `3b0d` reads "**Ready to merge?** No" as well.

Skill and subagent dispatch are independently confirmed by the deterministic
post-checks in each run's `verdict.json`: `skill-called superpowers:requesting-code-review`
and `tool-called Agent` both passed in trials 1, 2, 3 and in `3b0d`. `341c` has
no post-check results because the run did not reach the post phase, and `b15c`
has none because it never left setup.

## Mechanical changes to the copied run directories

The six S1 runs were copied whole from `results/`, then the changes below were
made so the copies could be committed. The same rule was applied to the two
preserved sentinel runs in `../sentinel-runs/`, to the control run in
`../sentinel-control/`, and to the fix-round-2 re-run in `../sentinel-rerun/`.
They follow the rule Task 8's arm established and Task 9's arm extended. None touches a JSON or log artifact, and none affects
anything cited above.

1. `coding-agent-workdir/.git` is renamed to `coding-agent-workdir/git-dir` in
   every run. Left as `.git`, each fixture repo is an embedded git repository:
   `git add` records it as a gitlink, and a clone of this repository gets an empty
   `coding-agent-workdir`. Renamed, the fixture history is committed as ordinary
   files; rename it back to inspect it with git.
2. `home/.claude/plugins/` is deleted from every run — a multi-megabyte per-run
   clone of the third-party plugin marketplace the harness provisions into the
   agent's home. Nothing here cites it. The session transcripts and reviewer
   reports this file reads from are under `home/.claude/projects/` and are
   untouched.
3. `home/.claude/.claude-env` is deleted from every run. The harness writes the
   host's cloud configuration there — the Vertex project id, the cloud region, and
   the path to the host's application-default credentials file. It is
   configuration of the machine that ran the arm, not evidence about the arm, and
   this repository's remote is public.
4. `home/.claude/sessions/` is deleted from every run that had one. Each pair is a
   Claude IPC session lock: a `.json` naming the pid, session id and working
   directory, and a `.key` holding `peerToken`, `procStart` and `pidDomain`, where
   `peerToken` is a 32-character bearer-shaped credential for the local messaging
   socket. They are runtime state of the machine, nothing here cites them, and
   this repository's remote is public.
5. `home/.tmp/node-compile-cache/` is deleted from the runs that had one
   (`3b0d`, and the control run `c483`). Node's compile cache is reinstallable and
   nothing here cites it. The other stripped paths in the established rule —
   `home/.local/share/claude`, `home/.cache/claude`, and `home/.npm/_cacache/` —
   were absent from most of these runs; the strip was attempted for each run and
   removed only what was there. `home/.npm/_logs/` and `home/.npm/_npx/` manifests
   stay where present.
6. `gauntlet-agent/results/` and `home/.claude/` are staged with `git add -f`. The
   repository's `.gitignore` carries unanchored `results/` and `.claude/`
   patterns, which match at any depth and would otherwise have silently excluded
   every grader report and every reviewer transcript this file cites.
7. `home/.codex/tmp/` is deleted from the one run that had it (`3014`). It holds
   three Mach-O helper binaries the Codex CLI extracts to a temp directory —
   `apply_patch`, `applypatch`, `codex-execve-wrapper` — plus an empty `.lock`.
   Neither arm before this one produced the path, so it is not in the inherited
   strip list, but it is the same class as the CLI install and the caches that
   list already covers: reinstallable machine state, cited by nothing, and
   binaries in a repository whose remote is public. This extends the rule for
   whoever copies the next arm.

The copy shrank from 34 MB to 6.0 MB across the first four runs, and the two
fix-round-1 additions bring the treatment directory to 7.6 MB. `b15c` contributes
24 KB: it has an empty `home/` and an empty workdir, because it died in setup.

The fix-round-1 runs needed one strip each that the earlier four did not
individually need and none that the rule above does not already cover: `0eb0`
gave up `home/.claude/plugins/`, `home/.claude/.claude-env` and
`home/.claude/sessions/`; `b15c` only `home/.claude/.claude-env`; and the control
run `c483` those three plus `home/.tmp/node-compile-cache/` and
`home/.npm/_cacache/`. No run in this round produced `home/.codex/tmp/`, so item
7 stands as an extension of the rule for future arms rather than a strip this
round exercised.

## Copy-hygiene post-check

Run against the staged index, before each commit. The block below is the check as
it stood at the first commit, covering the arm's first four
`code-review-precision-on-mixed-diff` runs plus the two non-green sentinel runs
`sentinel-runs/` preserves and `adjudication.md` cites in detail. Fix round 1's
additions are checked in the subsection after it.

```
=== 1. gitlinks staged under task-19-runs (expect 0) ===
       0
=== 2. per-run transcripts / result.json / top-level JSON ===
  code-review-precision-on-mixed-diff-claude-auto-20260913T212538Z-a249  transcripts=2  result.json=1  top-level-json=4
  code-review-precision-on-mixed-diff-claude-auto-20260913T213134Z-3014  transcripts=2  result.json=1  top-level-json=4
  code-review-precision-on-mixed-diff-claude-auto-20260913T213753Z-3b0d  transcripts=2  result.json=0  top-level-json=4
  code-review-precision-on-mixed-diff-claude-auto-20260913T214539Z-341c  transcripts=1  result.json=0  top-level-json=2
  superpowers-bootstrap-claude-auto-20260913T215416Z-3e65  transcripts=0  result.json=0  top-level-json=2
  triggering-writing-plans-claude-auto-20260913T215416Z-af50  transcripts=1  result.json=1  top-level-json=4
=== 3. home/*/* census (staged), task-19 vs committed arms ===
-- task-19 entries --
.cache/hyperpowers
.claude.json
.claude/.claude.json
.claude/backups
.claude/history.jsonl
.claude/projects
.claude/settings.json
.claude/shell-snapshots
.npm/_logs
.npm/_update-notifier-last-checked
Applications/Claude Code URL Handler.app
-- entries in task-19 NOT in the committed arms (expect none) --
=== 4. credential greps over staged evidence ===
prj-dcpgenai            ->        0
peerToken (non-prose)   -> 0
.claude-env files       -> 0
assigned key values     ->        0
=== 5. stripped paths absent from every staged run (expect none listed) ===
       0
=== 6. staged file count ===
     487
```

Three cells need reading rather than skimming.

The `result.json=0` entries are not a hygiene miss. The grader never wrote a
result in `3b0d` or `341c`, and that absence is exactly what makes them void
attempts under the rule above rather than trials; the
same is true of `superpowers-bootstrap`, whose `transcripts=0` follows from a
failed pre-check that stopped the run before the agent started. Every run whose
grader completed has its `result.json`.

The census is compared against the two already-committed arms rather than
against a hand-written list, so the question it answers is whether this arm
carries anything the accepted arms do not. It carries nothing new. The three
paths those arms have and this one lacks — `.claude/file-history`, `.npm/_npx`,
and the caches — are simply absent from these runs.

The `peerToken` line filters out `measurements.md` files on purpose: all three
arms describe the session-lock strip in prose and name the field while doing so.
No lock file is staged in any arm. The assigned-key-value grep looks for an
actual value after `ANTHROPIC_API_KEY` or `ANTHROPIC_VERTEX_PROJECT_ID`, not for
the variable names, which appear as documentation in the staged skill copies in
every arm.

### Fix round 1 additions

The three run directories added in fix round 1 were checked the same way. The
census and credential checks are run over the whole arm, so they cover the
earlier runs too; checks 2 and 3 are scoped to what is new.

```
=== 1. gitlinks staged under task-19-runs (expect 0) ===
       0
=== 2. new run directories: transcripts / result.json / top-level JSON ===
  code-review-precision-on-mixed-diff-claude-auto-20260913T230456Z-0eb0  transcripts=2  result.json=1  top-level-json=4
  code-review-precision-on-mixed-diff-claude-auto-20260913T230325Z-b15c  transcripts=0  result.json=0  top-level-json=2
  triggering-writing-plans-claude-auto-20260913T231141Z-c483  transcripts=1  result.json=1  top-level-json=4
=== 3. stripped paths in the new runs (expect 0) ===
  code-review-precision-on-mixed-diff-claude-auto-20260913T230456Z-0eb0  stripped-path files=0
  code-review-precision-on-mixed-diff-claude-auto-20260913T230325Z-b15c  stripped-path files=0
  triggering-writing-plans-claude-auto-20260913T231141Z-c483  stripped-path files=0
=== 4. home/*/* census (staged), task-19 vs committed arms ===
-- entries in task-19 NOT in the committed arms (expect none) --
=== 5. credential greps over staged evidence ===
prj-dcpgenai (non-prose)-> 0
peerToken (non-prose)   -> 0
.claude-env files       -> 0
assigned key values     ->        0
=== 6. staged file count (this commit) ===
     172
```

`b15c` shows zeros in check 2 for the reason its own entry above gives: it never
started an agent, so there is no transcript and no grader result to have. Its two
top-level JSON files are `phase.json` and `verdict.json`, which is the whole run.

The `prj-dcpgenai` line gained a prose filter in this round, for the same reason
`peerToken` already had one and with the same care. The first fix-round-1 run of
the check reported one hit, and the hit was this file: the earlier post-check
output pasted above contains the check's own label line, so the check had begun
matching its own transcript. The filter excludes `measurements.md` and
`adjudication.md` and nothing else, so a real occurrence in a run artifact would
still be caught.

### Fix round 2 addition

The one run directory added in fix round 2 — the sentinel re-run in
`../sentinel-rerun/` — was checked the same way. The numbers below were
re-derived from the committed tree for this record rather than carried over from
that round's own report, which lives in the SDD workspace and does not survive
the branch. Checks 1, 4 and 5 run over the whole arm and so cover the earlier
runs as well; checks 2 and 3 are scoped to the new run.

```
=== 1. gitlinks staged under task-19-runs (expect 0) ===
       0
=== 2. new run directories: transcripts / result.json / top-level JSON ===
  triggering-writing-plans-claude-auto-20260914T055115Z-b9ab  transcripts=1  result.json=1  top-level-json=4
=== 3. stripped paths in the new runs (expect 0) ===
  triggering-writing-plans-claude-auto-20260914T055115Z-b9ab  stripped-path files=0
=== 4. home/*/* census (staged), task-19 vs committed arms ===
-- entries in task-19 NOT in the committed arms (expect none) --
=== 5. credential greps over staged evidence ===
prj-dcpgenai (non-prose)-> 0
peerToken (non-prose)   -> 0
.claude-env files       -> 0
assigned key values     ->        0
=== 6. file count in the fix-round-2 commit ===
      88
```

Check 6 counts the commit instead of a staged index, because it is re-derived
after that commit was made: `1652992` touched 88 files, 83 of them under
`sentinel-rerun/`. The other five are `README-arm.md`, this arm's
`adjudication.md`, `scenarios/triggering-writing-plans/checks.sh`,
`src/detect/implementation.ts` and `test/implementation.detect.test.ts` — the
last three being the instrument fix that round made rather than evidence it
preserved.

## Quote verification

Every double-quoted span in this file is verbatim text from a run artifact in
this directory; non-quotation uses are written in backticks instead, so the check
has no prose false positives to filter. The check extracts each such span and
fixed-string-searches every file under
`evidence/2026-09-10-external-workflow-adoption/` for it. Spans containing a quote, a newline,
or a backslash are not extracted: the JSONL transcripts store text JSON-escaped,
so those could not match verbatim regardless of whether the claim is true.

The verification output is recorded in `adjudication.md`, which is written after
this file and can therefore report the final count for both.
