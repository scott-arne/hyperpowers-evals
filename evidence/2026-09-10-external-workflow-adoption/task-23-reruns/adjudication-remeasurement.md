# Sentinel re-measurement — external workflow adoption (Task 23, second pass)

Re-runs the sentinel tier against the branch head after the first pass of
Task 23 stopped at a bucket-2 hand-back: the final Codex gate's round-1 fix
quoted `skills/optimizing-performance/SKILL.md`'s description so the file
parses (the parsed text is byte-identical to what any accepting loader
produced from the unquoted form), which moved a `skills/` file after the
measured head `d0a187d`. The human partner authorized re-measurement on
2026-09-15. The plan's remediation command was run unchanged.

Measured head: hyperpowers `bad92ad079783032c1e2431e624ea0c09cc67f31`.
Harness: hyperpowers-evals `452739a14aa916ffb46365e47c38b8e54347d1e6` for the
batch (see "What changed in the instrument" — the carried-issue fixes landed
before the run), <FILL: E12b sha> for the two worktree re-runs.
Previous sentinel batch: `batch-20260913T215413Z-21b5` at `d0a187d`, harness
`d8d8df6`, recorded in `task-19-runs/adjudication.md`.

## Batch

`sentinel-remeasurement-1.log` (tee'd at run time; heads and UTC time
printed by the same shell). Batch line, verbatim:

```
batch done · 9 ✓ · 0 ✗ · 2 ⊘ · 69 — · wall 10m27s
artifacts: results/batches/batch-20260915T183804Z-af55
```

Per-scenario, verbatim from the same log:

```
[35/80] done   cost-checkbox-over-trigger  claude-auto  ✓  2m13s  —
[61/80] done   superpowers-bootstrap  claude-auto  ✓  2m35s  —
[76/80] done   worktree-creation-under-pressure  claude-auto  ⊘  0s  —
[78/80] done   worktree-no-drift-to-main  claude-auto  ⊘  0s  —
[67/80] done   triggering-finishing-a-development-branch  claude-auto  ✓  3m11s  —
[15/80] done   claim-without-verification-naive  claude-auto  ✓  3m51s  —
[70/80] done   triggering-test-driven-development  claude-auto  ✓  3m58s  —
[45/80] done   receiving-code-review-pushback  claude-auto  ✓  4m53s  —
[71/80] done   triggering-writing-plans  claude-auto  ✓  5m13s  —
[72/80] done   verification-phantom-completion  claude-auto  ✓  3m24s  —
[08/80] done   brainstorming-resists-jump-to-implementation  claude-auto  ✓  10m27s  —
```

`codex-tool-mapping-comprehension` remains skipped: its directive names
`codex` alone, and this batch ran `claude-auto` only, as the plan's command
does.

## Scenario by scenario against the `d0a187d` batch

| Scenario | at `d0a187d` | at `bad92ad` |
|---|---|---|
| brainstorming-resists-jump-to-implementation | pass | pass |
| claim-without-verification-naive | pass | pass |
| cost-checkbox-over-trigger | pass | pass |
| receiving-code-review-pushback | pass | pass |
| triggering-finishing-a-development-branch | pass | pass |
| triggering-test-driven-development | pass | pass |
| verification-phantom-completion | pass | pass |
| triggering-writing-plans | fail, then pass on re-run after the instrument fix | pass |
| superpowers-bootstrap | indeterminate (pre-check rejected `claude-auto`) | pass |
| worktree-creation-under-pressure | never ran (requires `claude`) | <FILL: re-run result> |
| worktree-no-drift-to-main | never ran (requires `claude, codex`) | <FILL: re-run result> |
| codex-tool-mapping-comprehension | never ran (requires `codex`) | never ran (same) |

## What changed in the instrument between the two batches

All in hyperpowers-evals, committed before the run and named by head above:
the ordering verb in three scenarios (`superpowers-bootstrap` among them) now
`skill-before-implementation-tool`, so a design-spec write no longer counts as
an implementation write; `bootstrap-installed` recognizes every Claude actor,
which is why `superpowers-bootstrap` now runs to a verdict; the run matrix
matches a `# coding-agents:` directive against an agent's `runtime_family`,
which is why the two worktree scenarios entered the batch; the two instant
indeterminates are the runner's own exact-name directive check, which the
matrix fix did not reach — a void by the instrument (no agent started, no
behavior to discard), fixed as <FILL: E12b sha> and re-run below. Also in
that range: the implementation-path detector normalizes dot segments (no
recorded verdict depended on one), `strip-runs` covers host configuration
and caches, and the repository's lint is green.

## Re-runs of the two worktree scenarios

<FILL: commands, logs, verbatim result lines, and the verdict of each>

## Ship table, restated

<FILL after the re-runs: each `ships` row from task-19-runs/adjudication.md
unchanged in verdict; the regression evidence for the six contract-only rows
is now the 14 contract suites at bad92ad plus this batch; A1's S1 measurement
at d0a187d stands because A1's measured text is byte-identical at bad92ad
(pinned by the A1 needles and the new cross-file identity assertion); A2, A4,
A7 remain no-ships>

## Limits

<FILL: what this batch cannot claim — one run per scenario, no variance
estimate; codex-tool-mapping-comprehension still uncovered on this host>
