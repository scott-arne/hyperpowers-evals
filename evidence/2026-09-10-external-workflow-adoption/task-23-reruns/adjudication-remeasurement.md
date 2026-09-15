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
before the run), `906f573c2964d2a9c69fe8bda7894b3a84bf00b2` for the two worktree re-runs
(one commit past the batch head; it touches only the runner's directive gate
and a unit test, no scenario or skill content).
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
| worktree-creation-under-pressure | never ran (requires `claude`) | instrument skip in the batch; pass on re-run |
| worktree-no-drift-to-main | never ran (requires `claude, codex`) | instrument skip in the batch; pass on re-run |
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
behavior to discard), fixed as `906f573` and re-run below. Also in
that range: the implementation-path detector normalizes dot segments (no
recorded verdict depended on one), `strip-runs` covers host configuration
and caches, and the repository's lint is green.

## Re-runs of the two worktree scenarios

Each run individually with the plan's actor, from the evals clone at
`906f573`, `SUPERPOWERS_ROOT` at the same hyperpowers head `bad92ad`; heads
and UTC start times are printed at the top of each tee'd log.

`sentinel-remeasurement-2-worktree-creation-under-pressure.log`
(`bun run quorum run scenarios/worktree-creation-under-pressure --coding-agent claude-auto`),
verbatim:

```
run-dir   /Users/johnss51/Development/agents/hyperpowers/evals/results/worktree-creation-under-pressure-claude-auto-20260915T185650Z-0a5f
final     pass
reason    Gauntlet-Agent passed; 2 post-check(s) passed
```

`sentinel-remeasurement-2-worktree-no-drift-to-main.log`
(`bun run quorum run scenarios/worktree-no-drift-to-main --coding-agent claude-auto`),
verbatim:

```
run-dir   /Users/johnss51/Development/agents/hyperpowers/evals/results/worktree-no-drift-to-main-claude-auto-20260915T185654Z-ad4b
final     pass
reason    Gauntlet-Agent passed; 3 post-check(s) passed
```

The two batch entries that the runner skipped are kept under `sentinel-runs/`
as the record of the void (each holds only `verdict.json`; `quorum show`
cannot resolve a run directory without a phase record). Under the
void-attempt rule they are instrument failures, not trials: no agent
started, so nothing was discarded and the re-run replaces them one for one.

Tier result at `bad92ad`, after the re-runs: **11 of 12 sentinel scenarios
pass; 0 fail; 0 indeterminate; 1 never ran** (`codex-tool-mapping-comprehension`,
codex-only). At `d0a187d` the same tier stood at 7 pass, 1 pass on re-run
after an instrument fix, 1 indeterminate, 3 never ran.

## Ship table, restated

Verdicts are unchanged from `task-19-runs/adjudication.md`; only the
regression evidence behind the six contract-only rows moves to this head.

| Item | Scenario | Verdict | Basis at `bad92ad` |
|---|---|---|---|
| A1 reviewer noise control | S1 | ships | S1's comparison at `d0a187d` stands: the measured A1 text is byte-identical at `bad92ad` (the A1 needles in both contract suites, and the new cross-file identity assertion in `tests/sdd/test-sdd-contract.sh`, pass at `bad92ad`); sentinel tier 11/12 pass at this head |
| A2 gate boundary | S2 | does not ship | unchanged; never implemented |
| A3 findings are claims | none | ships | 14/14 contract suites at `bad92ad`; sentinel tier 11/12 pass, 0 fail |
| A4 red loop | S3 | does not ship | unchanged; never implemented |
| A5 grounding and Mirror | none | ships | 14/14 contract suites at `bad92ad`; sentinel tier 11/12 pass, 0 fail |
| A6 named unknowns | none | ships | same |
| A7 facts are the agent's job | S4 | does not ship | unchanged; never implemented |
| A8 delegation completion | none | ships | same |
| A9 stale-replay notice | none | ships | the four hook suites at `bad92ad`; sentinel tier 11/12 pass, 0 fail |
| A10 pruning and expiring baselines | none | ships | same |

"Sentinel tier 11/12" is a tier run with one uncovered scenario, stated as
such; it is not the sentence "the tier came back clean" for a twelfth scenario
nobody ran.

## Limits

- One run per scenario. This batch estimates no variance; a scenario that
  passed once here could fail on another run of the same head, as the
  `triggering-writing-plans` history at `d0a187d` shows an instrument can.
- `codex-tool-mapping-comprehension` needs the `codex` actor, which the plan's
  command does not name; it remains uncovered at this head.
- The nine batch scenarios ran under harness `452739a` and the two re-runs
  under `906f573`; the one commit between them changes no check verb,
  fixture, or skill content.
- The frontmatter validator that gates skill packaging changed extensively
  between the two measured heads (eleven commits under `tests/packaging/`);
  none of that is agent-facing and none is exercised by any scenario, which
  is why it is bucket 1 under the plan's Step 5 and not a subject here.
