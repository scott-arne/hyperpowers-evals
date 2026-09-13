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

## Model-id check over this arm

The one-non-null-id rule was run twice, and the two readings differ. Over all
four copied run directories:

```
code-review-precision-on-mixed-diff-claude-auto-20260913T212538Z-a249	claude-opus-5
code-review-precision-on-mixed-diff-claude-auto-20260913T213134Z-3014	claude-opus-5
code-review-precision-on-mixed-diff-claude-auto-20260913T213753Z-3b0d	claude-opus-5
code-review-precision-on-mixed-diff-claude-auto-20260913T214539Z-341c	None
distinct: ['claude-opus-5'] | null present: True
```

Over the two determinate trials alone:

```
code-review-precision-on-mixed-diff-claude-auto-20260913T212538Z-a249	claude-opus-5
code-review-precision-on-mixed-diff-claude-auto-20260913T213134Z-3014	claude-opus-5
distinct (determinate trials only): ['claude-opus-5'] | null present: False
```

The `null` belongs to `341c`, the Step 4 re-run, and it is the same fact that
makes that run indeterminate: its coding-agent transcript normalized to zero
tool-call rows, so the harness recorded no `economics.coding_agent` block at all
to read a model from. The rule as written says to re-run an odd trial before
writing anything, but `341c` is already the one re-run the arm is allowed — the
rule that an indeterminate trial is re-run once and then stays `I` is the more
specific one for this case, and a second re-run would exceed the budget this
task was given. The arm is therefore written up with the shortfall recorded
rather than spent away. Nothing in the comparison below reads `341c`: it
contributes no measurement, so the `null` cannot move a number.

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

Vector: `PPI`

Runner output for this scenario, verbatim:

```
run-id: code-review-precision-on-mixed-diff-claude-auto-20260913T212538Z-a249
run-id: code-review-precision-on-mixed-diff-claude-auto-20260913T213134Z-3014
run-id: code-review-precision-on-mixed-diff-claude-auto-20260913T213753Z-3b0d
trials: PPI
EXIT=2
```

Trial 3 was re-run once under Step 4, and the re-run was indeterminate as well,
so trial 3 stays `I` and is excluded from the mean. The re-run's own runner
output, verbatim from the same log:

```
run-id: code-review-precision-on-mixed-diff-claude-auto-20260913T214539Z-341c
EXIT=2
```

A single `quorum run` with no `--repeat` prints no `trials:` line; the run's
verdict is its `run-dir` block, whose `final` reads "indeterminate".

| Trial | Run id | Bugs caught (0-2) | Blocking findings on clean hunks (0-6) | Determinate |
|---|---|---|---|---|
| 1 | `code-review-precision-on-mixed-diff-claude-auto-20260913T212538Z-a249` | 2 | 0 | yes |
| 2 | `code-review-precision-on-mixed-diff-claude-auto-20260913T213134Z-3014` | 2 | 0 | yes |
| 3 | `code-review-precision-on-mixed-diff-claude-auto-20260913T213753Z-3b0d` | 2 | 0 | no |
| 3 (re-run) | `code-review-precision-on-mixed-diff-claude-auto-20260913T214539Z-341c` | not measurable | not measurable | no |

The `Determinate` column is each run's `verdict.json` `final` field: `pass` for
trials 1 and 2, `indeterminate` for `3b0d` and `341c`. Both indeterminate
verdicts are Gauntlet-Agent transport failures, not coding-agent behavior, and
both are recorded in the run's `gauntlet-agent/gauntlet-stderr.log`:

- `3b0d` — "The socket connection was closed unexpectedly. For more information, pass `verbose: true` in the second argument to fetch()".
  The coding agent finished: both post-checks passed in its `verdict.json`, and
  the reviewer subagent's report is present, so its two measurement cells are
  filled from the artifact even though the trial is excluded.
- `341c` — "The operation timed out.", and the run's `verdict.json` `reason`
  reads "Claude transcript(s) normalized to zero tool-call rows". This run has no
  `subagents/` directory and no reviewer report, so there is no artifact to read
  either cell from and both are recorded as not measurable rather than as a
  number.

Neither is the sandbox signature — `setup.sh` dying at `git init -b main` — and
the deterministic `pre` checks passed in all four runs, so the fixture was built
correctly every time.

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
- Trial 3 (`3b0d`, indeterminate, excluded from the mean): none. Artifact:
  `home/.claude/projects/*/*/subagents/agent-a1cf27b6ee0f81b72.jsonl`. Two
  Criticals, both planted bugs, and two Importants —
  "Input validation guard deleted — `src/db.js:5-6`" and
  "No test covers `src/db.js` — `test/session.test.js`" — both against
  `src/db.js`, the second a test-coverage finding. Clean hunk 4 was named in
  Strengths: "`close` (src/session.js:26) correctly uses `void` on the detached telemetry call".
  Hunk 4 and hunk 5 drew Minor entries only, under "Thin coverage of the new module."
- Trial 3 re-run (`341c`): not measurable. There is no reviewer subagent report
  in the run directory to apply the rule to.

### Recall precondition

Every determinate S1 trial in this arm caught 2 of 2 planted bugs, both filed
Critical, so the comparison is not void on recall grounds on this arm's side.
Read from the same reviewer-report artifact named per trial above:

- Trial 1 — "SQL injection: parameterized query replaced with string concatenation" and "Password verification downgraded from scrypt hash to plaintext equality", both under "#### Critical (Must Fix)".
- Trial 2 — "SQL injection: parameterized query replaced with string concatenation" and "Password verification downgraded from hashed comparison to plaintext equality", both Critical.
- Trial 3 (`3b0d`, excluded) — "SQL injection — `src/db.js:6-10`" and "Plaintext password comparison — `src/db.js:7 and 15`", both Critical.

No trial approved the merge. Each determinate report's assessment reads
"**Ready to merge?** No." (trial 1) and "**Ready to merge?** No" (trial 2);
`3b0d` reads "**Ready to merge?** No" as well.

Skill and subagent dispatch are independently confirmed by the deterministic
post-checks in each run's `verdict.json`: `skill-called superpowers:requesting-code-review`
and `tool-called Agent` both passed in trials 1, 2 and `3b0d`. `341c` has no
post-check results because the run did not reach the post phase.

## Mechanical changes to the copied run directories

The four runs were copied whole from `results/`, then the changes below were made
so the copies could be committed. They follow the rule Task 8's arm established
and Task 9's arm extended. None touches a JSON or log artifact, and none affects
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
5. `home/.tmp/node-compile-cache/` is deleted from the one run that had it
   (`3b0d`). Node's compile cache is reinstallable and nothing here cites it. The
   other stripped paths in the established rule — `home/.local/share/claude`,
   `home/.cache/claude`, and `home/.npm/_cacache/` — were not present in any of
   these four runs; the strip was attempted for each and reported nothing to
   remove. `home/.npm/_logs/` and `home/.npm/_npx/` manifests stay where present.
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

The copy shrank from 34 MB to 6.0 MB across the four runs.

## Copy-hygiene post-check

Run against the staged index, before the commit. Two runs in the census come from
the sentinel batch rather than from S1: the treatment arm is the four
`code-review-precision-on-mixed-diff` runs, and `sentinel-runs/` preserves the two
non-green sentinel runs `adjudication.md` cites in detail.

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
result in `3b0d` or `341c`, and that absence is the indeterminacy itself; the
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
