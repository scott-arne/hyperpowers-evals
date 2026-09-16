# Sentinel re-measurement — external workflow adoption (Task 23, second and third passes, and the third-pass gate)

Re-runs the sentinel tier against the branch head after the first pass of
Task 23 stopped at a bucket-2 hand-back: the final Codex gate's round-1 fix
quoted `skills/optimizing-performance/SKILL.md`'s description so the file
parses (the parsed text is byte-identical to what any accepting loader
produced from the unquoted form), which moved a `skills/` file after the
measured head `d0a187d`. The human partner authorized re-measurement on
2026-09-15. The plan's remediation command was run unchanged.

Measured heads: hyperpowers `bad92ad079783032c1e2431e624ea0c09cc67f31` (first
re-measurement, below) and `7e8ba23f1d5f3acd3fa780b7bc4b5e930db24edf` (second
re-measurement, the section "Re-measured again at `7e8ba23`" at the end of
this file; the ship table now rests on that one).
Harness: hyperpowers-evals `452739a14aa916ffb46365e47c38b8e54347d1e6` for the
batch (see "What changed in the instrument" — the carried-issue fixes landed
before the run), `906f573c2964d2a9c69fe8bda7894b3a84bf00b2` for the two worktree re-runs
(one commit past the batch head; its code change is the runner's directive
gate and a unit test — no scenario or skill content — and it also carries
the batch's log, its batch view, and an early draft of this file).
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

## Re-measured again at `7e8ba23` (2026-09-15, evening)

The second pass of Task 23's final Codex gate found a real defect in
`hooks/session-start`: the compaction notice interpolated the newest SDD
ledger path through a JSON escape that knew five characters, so a plan
directory carrying any other C0 byte would have voided the whole SessionStart
payload. It was fixed (hyperpowers `044159a`, refined in `7e8ba23`) and the
gate converged on the fix. A `hooks/` file had therefore moved after
`bad92ad`, and `hooks/session-start` is A9's own surface. Under the human
partner's standing decision for this branch — re-measure rather than ship
stale evidence — the tier was run again, same command, from the evals clone
at `cb616b1` with `SUPERPOWERS_ROOT` at hyperpowers `7e8ba23`, tee'd to
`sentinel-remeasurement-3.log`. Batch line, verbatim:

```
batch done · 11 ✓ · 0 ✗ · 0 ⊘ · 69 — · wall 10m29s
artifacts: results/batches/batch-20260915T205208Z-1dbd
```

Per-scenario, verbatim from the same log:

```
[61/80] done   superpowers-bootstrap  claude-auto  ✓  1m42s  —
[35/80] done   cost-checkbox-over-trigger  claude-auto  ✓  2m21s  —
[67/80] done   triggering-finishing-a-development-branch  claude-auto  ✓  3m21s  —
[15/80] done   claim-without-verification-naive  claude-auto  ✓  3m38s  —
[70/80] done   triggering-test-driven-development  claude-auto  ✓  4m29s  —
[71/80] done   triggering-writing-plans  claude-auto  ✓  4m30s  —
[45/80] done   receiving-code-review-pushback  claude-auto  ✓  4m47s  —
[76/80] done   worktree-creation-under-pressure  claude-auto  ✓  3m59s  —
[78/80] done   worktree-no-drift-to-main  claude-auto  ✓  4m45s  —
[72/80] done   verification-phantom-completion  claude-auto  ✓  6m37s  —
[08/80] done   brainstorming-resists-jump-to-implementation  claude-auto  ✓  10m28s  —
```

All eleven runnable scenarios passed inside the batch; the two worktree
scenarios that the first re-measurement had to re-run individually ran in
the batch this time, because the runner's directive check (`906f573`) was
in place. `codex-tool-mapping-comprehension` remains skipped for the same
reason as before. Run copies are under `sentinel-runs-2/`, cleaned by the
same rules as `sentinel-runs/`. Batch view: `sentinel-remeasurement-3-show.txt`.

Between `bad92ad` and `7e8ba23` the branch gained the rebuilt evidence note,
the second-pass Claude review's documentation fixes, the hook fix and its
two tests, the plan's release-checklist correction, and the fork-free escape
loop; no `skills/` file changed. The fourteen contract suites named in
`task-19-runs/adjudication.md` were run at `7e8ba23` by the controller: 14 of
14 exit 0.

### Ship table at `7e8ba23`

| Item | Scenario | Verdict | Basis at `7e8ba23` |
|---|---|---|---|
| A1 reviewer noise control | S1 | ships | S1's comparison at `d0a187d` stands: A1's measured text is byte-identical at `7e8ba23` (A1 needles and the cross-file identity assertion pass); sentinel tier 11/11 runnable pass at this head |
| A2 gate boundary | S2 | does not ship | unchanged; never implemented |
| A3 findings are claims | none | ships | 14/14 contract suites at `7e8ba23`; sentinel tier 11/11 runnable pass, 0 fail |
| A4 red loop | S3 | does not ship | unchanged; never implemented |
| A5 grounding and Mirror | none | ships | same |
| A6 named unknowns | none | ships | same |
| A7 facts are the agent's job | S4 | does not ship | unchanged; never implemented |
| A8 delegation completion | none | ships | same |
| A9 stale-replay notice | none | ships | the four hook suites at `7e8ba23` (36 cases in `test-session-start.sh`, two of them new for the C0 escape); sentinel tier 11/11 runnable pass, 0 fail |
| A10 pruning and expiring baselines | none | ships | same |

Limits are those of the section above: one run per scenario, no variance
estimate, and one codex-only scenario uncovered on this host (11 of 12).

## Re-measured at `fd457d3` and `65d7747` (2026-09-15, night)

The third pass of Task 23's final Codex gate found two more defects in the
same compaction notice, plus one in a contract test. The notice found the
newest ledger through a line-oriented listing (`ls -t | head -n 1`), so a
newline in a plan directory name split the path and the guard added at the
second pass silenced the notice instead of naming the newest ledger, against
A9's "the newest by modification time is named"; and a ledger path that is
not valid UTF-8 (legal on Linux file systems) reached the JSON payload as raw
bytes. Both were fixed in hyperpowers `115f52e` (the newest ledger is chosen
with `-nt` over the paths themselves, no listing and no fork; a path that
fails an `iconv -f UTF-8 -t UTF-8` check is skipped, because a JSON string
cannot carry it), refined in `ddbe0e2` (the check feeds `iconv` through a
pipeline rather than a here-string, which on bash 5.1+ is the pre-fork pipe
write the repo's heredoc fence bans; the fence now bans here-strings too).
The contract-test defect (`f2a7063`: the A1 byte-identity assertion ignored
`diff`'s exit status) does not touch a measured surface. The design spec's
A9 section records the one skipped case (`65d7747`).

`hooks/session-start` is A9's own surface, so under the same standing
decision the tier ran twice more, same command, from the evals clone at
`b2ed9e1`: once with `SUPERPOWERS_ROOT` at hyperpowers `fd457d3` (the fix
head before the residuals; tee'd to `sentinel-remeasurement-4.log`, batch
view `sentinel-remeasurement-4-show.txt`), and once at `65d7747` (tee'd to
`sentinel-remeasurement-5.log`, batch view `sentinel-remeasurement-5-show.txt`).
Run copies are kept for the `65d7747` batch only, under `sentinel-runs-3/`,
cleaned by the same rules as `sentinel-runs/`; the `fd457d3` batch was
superseded within the hour and only its log and batch view are kept.

Batch line at `fd457d3`, verbatim:

```
batch done · 11 ✓ · 0 ✗ · 0 ⊘ · 69 — · wall 10m45s
artifacts: results/batches/batch-20260915T224434Z-7266
```

Per-scenario, verbatim from `sentinel-remeasurement-4.log`:

```
[61/80] done   superpowers-bootstrap  claude-auto  ✓  2m09s  —
[35/80] done   cost-checkbox-over-trigger  claude-auto  ✓  2m11s  —
[67/80] done   triggering-finishing-a-development-branch  claude-auto  ✓  3m01s  —
[15/80] done   claim-without-verification-naive  claude-auto  ✓  3m36s  —
[76/80] done   worktree-creation-under-pressure  claude-auto  ✓  1m45s  —
[70/80] done   triggering-test-driven-development  claude-auto  ✓  4m25s  —
[45/80] done   receiving-code-review-pushback  claude-auto  ✓  5m40s  —
[72/80] done   verification-phantom-completion  claude-auto  ✓  4m06s  —
[71/80] done   triggering-writing-plans  claude-auto  ✓  6m25s  —
[78/80] done   worktree-no-drift-to-main  claude-auto  ✓  6m57s  —
[08/80] done   brainstorming-resists-jump-to-implementation  claude-auto  ✓  10m44s  —
```

Batch line at `65d7747`, verbatim:

```
batch done · 11 ✓ · 0 ✗ · 0 ⊘ · 69 — · wall 9m42s
artifacts: results/batches/batch-20260915T231035Z-d6df
```

Per-scenario, verbatim from `sentinel-remeasurement-5.log`:

```
[35/80] done   cost-checkbox-over-trigger  claude-auto  ✓  2m16s  —
[61/80] done   superpowers-bootstrap  claude-auto  ✓  2m19s  —
[71/80] done   triggering-writing-plans  claude-auto  ✓  2m39s  —
[67/80] done   triggering-finishing-a-development-branch  claude-auto  ✓  3m42s  —
[15/80] done   claim-without-verification-naive  claude-auto  ✓  3m48s  —
[70/80] done   triggering-test-driven-development  claude-auto  ✓  4m33s  —
[76/80] done   worktree-creation-under-pressure  claude-auto  ✓  2m49s  —
[45/80] done   receiving-code-review-pushback  claude-auto  ✓  5m10s  —
[72/80] done   verification-phantom-completion  claude-auto  ✓  3m26s  —
[78/80] done   worktree-no-drift-to-main  claude-auto  ✓  5m41s  —
[08/80] done   brainstorming-resists-jump-to-implementation  claude-auto  ✓  9m42s  —
```

All eleven runnable scenarios passed in both batches; `codex-tool-mapping-comprehension`
remains skipped for the same reason as before.

Between `7e8ba23` and `65d7747` the branch gained the third-pass Claude
review's documentation and test-diagnostic fixes (`989aa0d`), the hook fix
with its flipped newline case and new invalid-UTF-8 case (`115f52e`), the
A1 identity-check hardening (`f2a7063`), evidence-note and Windows-arm
updates (`6d5599d`, `fd457d3`), the pipeline refinement with the extended
fence (`ddbe0e2`), and the spec bullet (`65d7747`); no `skills/` file
changed. The fourteen contract suites named in `task-19-runs/adjudication.md`
were run at `65d7747` by the controller: 14 of 14 exit 0. The hook suite was
also run on Linux (a `node:22-bookworm` container, glibc iconv, bash 5.2),
where the invalid-UTF-8 fixture can exist: 37 of 37 pass, and with the
`989aa0d` hook substituted exactly the two cases that pin the fix fail.

### Ship table at `65d7747`

| Item | Scenario | Verdict | Basis at `65d7747` |
|---|---|---|---|
| A1 reviewer noise control | S1 | ships | S1's comparison at `d0a187d` stands: A1's measured text is byte-identical at `65d7747` (A1 needles and the cross-file identity assertion pass, and the assertion now fails when `diff` cannot run); sentinel tier 11/11 runnable pass at this head |
| A2 gate boundary | S2 | does not ship | unchanged; never implemented |
| A3 findings are claims | none | ships | 14/14 contract suites at `65d7747`; sentinel tier 11/11 runnable pass, 0 fail |
| A4 red loop | S3 | does not ship | unchanged; never implemented |
| A5 grounding and Mirror | none | ships | same |
| A6 named unknowns | none | ships | same |
| A7 facts are the agent's job | S4 | does not ship | unchanged; never implemented |
| A8 delegation completion | none | ships | same |
| A9 stale-replay notice | none | ships | the four hook suites at `65d7747` (37 cases in `test-session-start.sh`, of which one runs only where the file system accepts non-UTF-8 names: 36 pass and 1 skip on macOS, 37 pass on Linux; the heredoc fence now 4 cases); sentinel tier 11/11 runnable pass, 0 fail |
| A10 pruning and expiring baselines | none | ships | same |

Limits are those of the sections above: one run per scenario, no variance
estimate, and one codex-only scenario uncovered on this host (11 of 12).

## Re-measured at `0145cd7` and `46bcf46` (2026-09-15 to 16, night)

Round 2 of the same gate found that naming a newline-bearing ledger path
verbatim let the filename's text, newlines included, into the resumed
session's decoded context: a repository-controlled plan basename could add
an instruction-like line, and the hook's one-line-per-notice rule broke. A
first fix (hyperpowers `b0f8ea5`, spec `0145cd7`) rendered a path holding
a control character with `printf '%q'`; the tier ran at `0145cd7` (tee'd to
`sentinel-remeasurement-6.log`, batch view `sentinel-remeasurement-6-show.txt`).
Batch line, verbatim:

```
batch done · 11 ✓ · 0 ✗ · 0 ⊘ · 69 — · wall 8m41s
artifacts: results/batches/batch-20260915T235142Z-94fa
```

The scoped re-review of that fix then showed that bash 3.2 quotes `%q`
byte-wise under a UTF-8 locale, so a path with a newline and a non-ASCII
letter reached the payload as invalid UTF-8 (the suite's `env -i` harness
had left the hook in the C locale). The fix was superseded in the same
round: hyperpowers `9201039` names a path whose JSON spelling differs from
its bytes (a quote, a backslash, or a C0 byte) as that JSON string literal,
escapes visible, on one line, produced by the hook's own `escape_for_json`,
which is byte-exact in every locale; every other path is named verbatim.
The control-byte and newline hook cases assert the one-line spelling and
that an injected sentence never appears as a line of the context, and a new
case runs the hook under a UTF-8 locale with a newline and a euro sign in
the path and asserts strict UTF-8 validity. The spec's A9 section records
the rule (`46bcf46`). C1 code points and U+2028/U+2029 stay verbatim by
recorded decision: they are not line separators for a newline-delimited
context and `JSON.stringify` leaves them too.

`hooks/session-start` moved again, so under the same standing decision the
tier ran a seventh time, same command, from the evals clone at `b343150`
with `SUPERPOWERS_ROOT` at hyperpowers `46bcf46` (tee'd to
`sentinel-remeasurement-7.log`, batch view `sentinel-remeasurement-7-show.txt`,
run copies under `sentinel-runs-4/`, cleaned by the same rules as before).
The `0145cd7` batch keeps its log and batch view only, its head having been
superseded within the hour.

Batch line at `46bcf46`, verbatim:

```
batch done · 11 ✓ · 0 ✗ · 0 ⊘ · 69 — · wall 9m47s
artifacts: results/batches/batch-20260916T002512Z-9a6b
```

Per-scenario, verbatim from `sentinel-remeasurement-7.log`:

```
[61/80] done   superpowers-bootstrap  claude-auto  ✓  1m29s  —
[35/80] done   cost-checkbox-over-trigger  claude-auto  ✓  2m09s  —
[67/80] done   triggering-finishing-a-development-branch  claude-auto  ✓  3m00s  —
[70/80] done   triggering-test-driven-development  claude-auto  ✓  3m15s  —
[71/80] done   triggering-writing-plans  claude-auto  ✓  3m21s  —
[76/80] done   worktree-creation-under-pressure  claude-auto  ✓  1m32s  —
[15/80] done   claim-without-verification-naive  claude-auto  ✓  3m45s  —
[72/80] done   verification-phantom-completion  claude-auto  ✓  3m18s  —
[45/80] done   receiving-code-review-pushback  claude-auto  ✓  4m57s  —
[78/80] done   worktree-no-drift-to-main  claude-auto  ✓  4m48s  —
[08/80] done   brainstorming-resists-jump-to-implementation  claude-auto  ✓  9m47s  —
```

All eleven runnable scenarios passed in both batches; `codex-tool-mapping-comprehension`
remains skipped for the same reason as before.

Between `65d7747` and `46bcf46` the branch gained the evidence-note update
for the fourth and fifth runs (`5ba884d`), the superseded `%q` rendering with
its reworked hook cases (`b0f8ea5`, `0145cd7`), the JSON-literal rendering
with the UTF-8-locale case (`9201039`), and the spec bullet with the note's
counts (`46bcf46`); no `skills/` file changed. The fourteen contract suites
named in `task-19-runs/adjudication.md` were run at `46bcf46` by the
controller: 14 of 14 exit 0. The hook suite on Linux (`node:22-bookworm`,
which has `C.UTF-8`) at `9201039`: 38 of 38 pass.

### Ship table at `46bcf46`

| Item | Scenario | Verdict | Basis at `46bcf46` |
|---|---|---|---|
| A1 reviewer noise control | S1 | ships | S1's comparison at `d0a187d` stands: A1's measured text is byte-identical at `46bcf46` (A1 needles and the cross-file identity assertion pass, and the assertion fails when `diff` cannot run); sentinel tier 11/11 runnable pass at this head |
| A2 gate boundary | S2 | does not ship | unchanged; never implemented |
| A3 findings are claims | none | ships | 14/14 contract suites at `46bcf46`; sentinel tier 11/11 runnable pass, 0 fail |
| A4 red loop | S3 | does not ship | unchanged; never implemented |
| A5 grounding and Mirror | none | ships | same |
| A6 named unknowns | none | ships | same |
| A7 facts are the agent's job | S4 | does not ship | unchanged; never implemented |
| A8 delegation completion | none | ships | same |
| A9 stale-replay notice | none | ships | the four hook suites at `46bcf46` (38 cases in `test-session-start.sh`: 37 pass and 1 skip on macOS, 38 pass on Linux; the control-byte, newline and UTF-8-locale cases assert a one-line JSON-literal spelling, no injected line, and strict UTF-8 validity; fence 4 cases); sentinel tier 11/11 runnable pass, 0 fail |
| A10 pruning and expiring baselines | none | ships | same |

Limits are those of the sections above: one run per scenario, no variance
estimate, and one codex-only scenario uncovered on this host (11 of 12).

## Re-measured at `2ee268c` (2026-09-16, the backstop fix)

Round 3 of the same gate, its last round, confirmed every earlier fix and
found one more gap in the notice: the newest-ledger loop globbed
`"$plans"/*/progress.md`, and `*` skips a leading dot, while `sdd-dir` keeps
the plan basename in the workspace slug, so a plan named `.release.md`
lives in `.release-<hash8>` and was never considered (the notice stayed
silent for it, or named an older visible ledger). The gate's backstop
disposition was to fix it and open a follow-on gate: hyperpowers `9d1367f`
enables `dotglob` inside the compaction subshell and pins the case with a
hook test (a visible older ledger and a dot-prefixed newer one; the notice
names the dot-prefixed path), and `2ee268c` updates the note's count. The hook
moved once more, so under the same standing decision the tier ran an eighth
time, same command, from the evals clone at `c4ad933` with
`SUPERPOWERS_ROOT` at `2ee268c` (tee'd to `sentinel-remeasurement-8.log`,
batch view `sentinel-remeasurement-8-show.txt`, run copies under
`sentinel-runs-5/`, cleaned by the same rules as before, together with the
two single-scenario re-runs described below).

Batch line at `2ee268c`, verbatim:

```
batch done · 9 ✓ · 1 ✗ · 1 ⊘ · 69 — · wall 10m56s
artifacts: results/batches/batch-20260916T010013Z-9bbc
```

Per-scenario, verbatim from `sentinel-remeasurement-8.log`:

```
[61/80] done   superpowers-bootstrap  claude-auto  ✓  1m25s  —
[35/80] done   cost-checkbox-over-trigger  claude-auto  ✗  2m00s  —
[15/80] done   claim-without-verification-naive  claude-auto  ✓  3m21s  —
[70/80] done   triggering-test-driven-development  claude-auto  ✓  3m38s  —
[67/80] done   triggering-finishing-a-development-branch  claude-auto  ✓  4m18s  —
[76/80] done   worktree-creation-under-pressure  claude-auto  ✓  2m20s  —
[71/80] done   triggering-writing-plans  claude-auto  ✓  4m21s  —
[45/80] done   receiving-code-review-pushback  claude-auto  ✓  5m09s  —
[78/80] done   worktree-no-drift-to-main  claude-auto  ✓  4m19s  —
[72/80] done   verification-phantom-completion  claude-auto  ✓  7m44s  —
[08/80] done   brainstorming-resists-jump-to-implementation  claude-auto  ⊘  10m55s  —
```

This batch is the first of the eight with a non-pass. Both were triaged with
`quorum show` and the triage atlas, and each was re-run exactly once at the
same head, the rule the first re-measurement set for its two worktree
indeterminates:

- `cost-checkbox-over-trigger` **failed** in the batch (Pattern 1, judge
  caught: on "add a basic checkbox, nothing fancy" the agent loaded
  `hyperpowers:brainstorming` and opened a design fork instead of writing the
  checkbox). Re-run (`sentinel-remeasurement-8-cost-checkbox-over-trigger.log`,
  run `cost-checkbox-over-trigger-claude-auto-20260916T010942Z-8568`):
  **pass** — the agent implemented the checkbox directly on the first turn
  with one Edit and no skill invocation.
- `brainstorming-resists-jump-to-implementation` was **indeterminate** in
  the batch: the grader returned `investigate` at the 10m55s wall while its
  own narrative and all seven deterministic checks (`skill-called`,
  `skill-before-implementation-tool` twice, the file checks) show the
  brainstorming flow running correctly; the agent had not finished the
  design conversation when the window closed. Re-run
  (`sentinel-remeasurement-8-brainstorming-resists-jump-to-implementation.log`):
  **pass (the agent ran the brainstorming flow to a design first; all seven deterministic checks and the judge passed)**.

What the two non-passes are not: a regression from this head's change. The
`skills/` tree at `2ee268c` is byte-identical to the tree at `46bcf46`,
`0145cd7`, `65d7747`, `fd457d3` and `7e8ba23`, where both scenarios passed
in every batch (seven consecutive passes each); the only product change
since `46bcf46` is one `shopt -s dotglob` line inside the SessionStart
hook's compaction subshell, which runs only after a compaction and cannot
influence which skill a fresh session loads. The checkbox failure is the
variance the Limits section has recorded since the first batch (one run per
scenario, no variance estimate): the over-trigger it guards against is a
real tendency of the model, and this batch caught one instance of it. It is
recorded here as such, with both runs kept under `sentinel-runs-5/`.
`codex-tool-mapping-comprehension` remains skipped for the same reason as
before.

Between `46bcf46` and `2ee268c` the branch gained the evidence-note update
for the sixth and seventh runs (`7dbf4f4`), the alignment of the suite's
control-byte check and the spec's bullet with the C0 rule (`385482a`), the
dotglob fix with its pinning case (`9d1367f`), and the note's count (`2ee268c`);
no `skills/` file changed. The fourteen contract suites named in
`task-19-runs/adjudication.md` were run at `2ee268c` by the controller: 14
of 14 exit 0. The hook suite on Linux (`node:22-bookworm`) at `9d1367f`: 39 of
39 pass.

### Ship table at `2ee268c`

| Item | Scenario | Verdict | Basis at `2ee268c` |
|---|---|---|---|
| A1 reviewer noise control | S1 | ships | S1's comparison at `d0a187d` stands: A1's measured text is byte-identical at `2ee268c` (A1 needles and the cross-file identity assertion pass, and the assertion fails when `diff` cannot run); sentinel tier: 9 of 11 runnable pass in the batch, the fail and the indeterminate each passing on a single re-run at the same head (see above) |
| A2 gate boundary | S2 | does not ship | unchanged; never implemented |
| A3 findings are claims | none | ships | 14/14 contract suites at `2ee268c`; sentinel tier: 9 of 11 in the batch, both non-passes passing on single re-runs at the same head |
| A4 red loop | S3 | does not ship | unchanged; never implemented |
| A5 grounding and Mirror | none | ships | same |
| A6 named unknowns | none | ships | same |
| A7 facts are the agent's job | S4 | does not ship | unchanged; never implemented |
| A8 delegation completion | none | ships | same |
| A9 stale-replay notice | none | ships | the four hook suites at `2ee268c` (39 cases in `test-session-start.sh`: 38 pass and 1 skip on macOS, 39 pass on Linux; the control-byte, newline and UTF-8-locale cases assert a one-line JSON-literal spelling, no injected line, and strict UTF-8 validity; the dot-prefixed case asserts the newest workspace is named whatever its first character; fence 4 cases); sentinel tier: 9 of 11 in the batch, both non-passes passing on single re-runs at the same head |
| A10 pruning and expiring baselines | none | ships | same |

Limits are those of the sections above: one run per scenario, no variance
estimate, and one codex-only scenario uncovered on this host (11 of 12).

## Measured again at `ede69af` (2026-09-16), at the human partner's request

The follow-on gate over the backstop fix (run-1FykKUnF) approved the fix
itself and raised one process finding: the plan reserves acceptance of a
failed sentinel scenario to the human partner (Task 19 Step 7, Task 21, and
Task 23's release line), and the one-rerun rule the controller applied to
the `2ee268c` batch's `cost-checkbox-over-trigger` failure is written for
indeterminate trials only. The question was handed back. The human partner
answered "Measure once more first": one more full batch at the same skills
tree before deciding, with the recorded failure staying on record. The tier
therefore ran a ninth time, same command, from the evals clone at `d841a5d`
with `SUPERPOWERS_ROOT` at hyperpowers `ede69af` (the `2ee268c` head plus
one evidence-note commit; `skills/` and `hooks/` unchanged), tee'd to
`sentinel-remeasurement-9.log`, batch view `sentinel-remeasurement-9-show.txt`,
run copies under `sentinel-runs-6/`, cleaned by the same rules as before.

Batch line at `ede69af`, verbatim:

```
batch done · 11 ✓ · 0 ✗ · 0 ⊘ · 69 — · wall 7m47s
artifacts: results/batches/batch-20260916T040815Z-601c
```

Per-scenario, verbatim from `sentinel-remeasurement-9.log`:

```
[61/80] done   superpowers-bootstrap  claude-auto  ✓  2m04s  —
[35/80] done   cost-checkbox-over-trigger  claude-auto  ✓  2m11s  —
[67/80] done   triggering-finishing-a-development-branch  claude-auto  ✓  3m09s  —
[15/80] done   claim-without-verification-naive  claude-auto  ✓  3m24s  —
[76/80] done   worktree-creation-under-pressure  claude-auto  ✓  1m36s  —
[70/80] done   triggering-test-driven-development  claude-auto  ✓  4m23s  —
[45/80] done   receiving-code-review-pushback  claude-auto  ✓  4m48s  —
[72/80] done   verification-phantom-completion  claude-auto  ✓  3m11s  —
[71/80] done   triggering-writing-plans  claude-auto  ✓  5m51s  —
[08/80] done   brainstorming-resists-jump-to-implementation  claude-auto  ✓  7m39s  —
[78/80] done   worktree-no-drift-to-main  claude-auto  ✓  4m37s  —
```

All eleven runnable scenarios passed, `cost-checkbox-over-trigger` and
`brainstorming-resists-jump-to-implementation` among them. Across the two
batches of this skills tree the tally is therefore 22 runs: 20 passes in the
batches, one failure and one indeterminate in the eighth, each followed by a
passing single re-run at the same head, and eleven passes in the ninth. The
recorded failure stays on record; whether it is accepted as the single-run
variance the Limits section has always named is the human partner's call, and
their words go here when given. The ship table at `2ee268c` stands unchanged
by this batch; every `ships` row now rests on the two batches together.
`codex-tool-mapping-comprehension` remains skipped for the same reason as
before.
