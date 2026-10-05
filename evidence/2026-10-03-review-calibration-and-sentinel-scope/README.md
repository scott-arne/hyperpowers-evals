# Review Calibration: the Pathological-Input Cap (2026-10-03)

The RED arm for Fix 1 of the hyperpowers review-calibration plan. Six direct
Codex reviews ran under the control focus, three on fixture P and three on
its pre-registered revision P2. None of them blocked, so the plan stopped
before the treatment arm and no sentence ships.

## Purpose

Fix 1 of the spec proposes one sentence for the three adversarial-review focus
strings in hyperpowers `skills/requesting-code-review/recipe-code.md`. It caps
at medium a defect that only hand-made input reaches. The plan measures that
sentence before it ships. It first has to reproduce the over-rating it targets:
under the control focus, Codex must block the pathological fixture in at least
2 of 3 reviews. Only then does the treatment arm run.

- Spec: hyperpowers
  `docs/hyperpowers/specs/2026-10-03-review-calibration-and-sentinel-scope-design.md`,
  "Fix 1" and "Evaluation".
- Plan: hyperpowers
  `docs/hyperpowers/plans/2026-10-03-review-calibration-and-sentinel-scope.md`,
  Tasks 3 to 7.
- Pre-registration: both files committed in hyperpowers `c7f4063` before the
  first review. Task 4's preflight found no line removed or changed since.

## Instrument

- **Runner.** `scripts/codex-focus-arm.sh` at evals `fd1b5c701`, committed
  2026-10-04T23:43:51Z, before the first review. It builds each fixture's base
  and head in a temp repository, checks that both parse and pass `test.js`, and
  composes the correctness-lens skeleton with the arm's focus file. It then
  runs `codex-companion.mjs adversarial-review --base <base> --json <focus>` in
  that repository and pipes the capture through `verdict-normalize`. Before
  any review it proves that the control file is `recipe-code.md` line 53 at
  hyperpowers `5bef46c` and that the treatment file is the control file plus
  the cap sentence. Each invocation starts its own broker, keyed to a fresh
  `mktemp -d` directory, and stops only that broker.
- **Runtime record.** Quoted from `task-4-runs/control-P/runtime-start.txt`:

  ```
  companion 1.0.6
  codex-binary /opt/homebrew/bin/codex
  codex-version codex-cli 0.160.0
  model = "gpt-5.6-sol"
  model_reasoning_effort = "xhigh"
  verdict-normalize 7111b3b5adf8263137862536c27e86cfbf5565aa
  ```

  The last line is the blob of hyperpowers
  `skills/requesting-code-review/scripts/verdict-normalize`, the same blob at
  `5bef46c` (v6.15.0) and on the plan's branch.
- **Focus files**, committed in `fd1b5c701`:

  | File | sha256 |
  |---|---|
  | `cap-sentence.txt` | `0fd022844d9f0cd2d393859a1a228b62f173024cba2e84f395289afd63310931` |
  | `focus-control.txt` | `b8395f171057708d822046e449b0119dfcb726c0112335c98c8e6e8fd06ad2e3` |
  | `focus-treatment.txt` | `c8a0a3b8dd94d8624578436b28d329965dd45d538dae93f77e1750a6e119a976` |

  `focus-control.txt` is `recipe-code.md` line 53's focus string at `5bef46c`,
  with its four path placeholders pointed at the fixture's `REQUIREMENTS.md`
  and `review.diff`. `focus-treatment.txt` is that file with the cap sentence
  and one space inserted after "Naming, style, and speculative hardening are
  low. ". Only the control file was used.

## Fixtures

All six live in `fixtures/codex-focus-arm/`. Only P and P2 were reviewed.

- **M** (2026-09-05): defect-free percent-string branch of `parseRate` (trim,
  NaN on an empty body). Not reviewed here.
- **H** (2026-09-05): crash and wrong result on ordinary input. An unanchored
  regex returns wrong values for `-25%`, `.5%` and `1e2%`, and throws on `"%"`.
  Not reviewed here.
- **O** (2026-09-05): omitted requirement. `parseRate` is correct, but
  `formatRate`, which the task asked for, is missing. Not reviewed here.
- **P** (new): the defect fires only on a name the library never creates.
  `formatWorkspaces` writes each directory name followed by a newline, and
  `countWorkspaces` counts the non-empty lines of that report. A name that
  contains a newline is counted twice and makes the report ambiguous.
  `createWorkspace` names directories with twelve hex digits, so only a
  hand-made directory reaches it. Nothing is stored. Reviewed under control.
- **P2** (pre-registered revision of P, committed in `fd1b5c701` before any
  review): `formatWorkspaces` prints the first seven characters of
  `name.match(/^[0-9a-f]{12}$/)[0]`. Any directory name that is not twelve
  lowercase hex digits makes `match()` return null, so the call throws.
  Reviewed under control.
- **Pc** (new): `markAll(root, kind)` appends one `<name>\t<kind>` line per
  workspace to `<root>/events.log`. A name that contains a newline splits its
  record, so later reads misattribute events. The cap's "corrupts stored data"
  exception should keep it blocking. Not reviewed here.

## Layout

- `cap-sentence.txt`, `focus-control.txt`, `focus-treatment.txt`: the focus
  inputs (see Instrument).
- `tally.py`: normalizes every capture under `task-*-runs/` and counts the
  results per run directory and fixture. It refuses to run unless the
  normalizer is the blob the reference runtime record names.
- `tally.txt`: `tally.py`'s output.
- `task-4-runs/control-P/` and `task-4-runs/control-P2/`, one runner
  invocation each, holding:
  - `<fixture>-control-<i>.json`: the companion's `--json` output for review
    `i`;
  - `<fixture>-control-<i>.json.err`: that command's stderr (empty in all six);
  - `run.log`: one line per review, the fixture, arm and index followed by
    `verdict-normalize`'s output;
  - `run.err`: the runner's stderr (empty in both);
  - `broker.txt`: the broker directory and endpoint the runner started;
  - `runtime-start.txt`, `runtime-end.txt`: the runtime record, written before
    the broker started and on exit.

There is no `task-5-runs/`. Task 5 did not run.

## Results

From `tally.txt`:

| Run directory | Fixture | Arm | Blocking | Approved | Incomplete |
|---|---|---|---|---|---|
| `task-4-runs/control-P` | P | control | 0/3 | 3/3 | 0/3 |
| `task-4-runs/control-P2` | P2 | control | 0/3 | 3/3 | 0/3 |

Treatment did not run.

**Outcome: no over-rating reproduced on P or P2 under control; no sentence
ships.** P blocked in 0 of 3, so the plan's Task 4 rule 3 ran P2. P2 also
blocked in 0 of 3, which is the Stop path. Tasks 5 and 6 did not run, Pc, H,
O and M were not reviewed, and `recipe-code.md` is unchanged.

- **No review reported the defect at any severity.** All six verdicts are
  `approve` with an empty findings list. The summaries:
  - P 1: "Ship: the new exports satisfy the stated formatting, ordering,
    empty-root, and counting requirements."
  - P 2: "Ship: the implementation satisfies the stated formatting, ordering,
    counting, export, and absent-root requirements without changing existing
    behavior."
  - P 3: "Ship: no substantive defect is supported by the provided context."
  - P2 1: "No substantive ship blocker found."
  - P2 2: "Ship: no substantive requirement or logic defect found. The new
    exports produce the required ordering, truncation, newline, count, and
    missing-root results under the stated workspace-name invariant."
  - P2 3: "Ship: the new functions satisfy the stated behavior without
    changing existing logic."
- **The stated invariant may have settled it.** Both fixtures' requirements
  say "Workspace directories are created only by `createWorkspace`, which
  names them with twelve lowercase hex digits". P2 2 cites "the stated
  workspace-name invariant" by name. The production findings this fix targets
  came from a gate with a full dossier and no such statement. Whether the
  sentence in the requirements suppressed the finding is untested.
- **Test evidence.** Three reviews (P 1, P 3, P2 2) answer the Coverage
  section's test-evidence axis "not applicable", because the requirements
  exclude tests for the new functions; P 2 states that exclusion without a
  label; P2 1 and P2 3 answer "cannot-verify".
- **Window.** control-P ran 2026-10-05T00:00:46Z to 00:02:55Z, control-P2
  00:07:33Z to 00:10:15Z (record mtimes; 2026-10-04 local time).

## Voids and re-runs

None. Both invocations exited 0 with three readings and no incomplete.

## Runtime records

Task 4 Step 5's check compares both records in every `task-4-runs/` directory
with the reference, `task-4-runs/control-P/runtime-start.txt`:

```bash
ev=/Users/johnss51/Development/agents/hyperpowers/evals/evidence/2026-10-03-review-calibration-and-sentinel-scope
ref="$ev/task-4-runs/control-P/runtime-start.txt"
[ "$(wc -l < "$ref" | tr -d ' ')" -eq 6 ] || echo "REFERENCE IS NOT SIX LINES"
for d in "$ev"/task-4-runs/*/; do for f in runtime-start.txt runtime-end.txt; do cmp -s "$ref" "$d$f" || echo "DIFFERS OR MISSING: $d$f"; done; done
```

Result: no output, when Task 4 ran and again when this README was written. All
four records are byte-identical to the reference. Superseded directories:
none.

## Deviations

From the plan, recorded before execution:

1. The runner's broker is keyed to a fresh `mktemp -d` directory, not the
   evals checkout, so an arm can never review through a broker another session
   recorded for that directory.
2. The comparability path set in `docs/scenario-authoring.md` §5 says the
   re-baseline launcher's set narrowed to the scenario's own directory;
   `logs/measure-launch.sh:31` pins all of `scenarios`.
3. §5's rows 1 and 2 cite the live hyperpowers ids `62d8044`, `d6a1681` and
   `7aff2a7` in place of the ids the 2026-10-01 history rewrite replaced, with
   a translation note.
4. P2 was committed before any review, so the revision could not be tuned to
   P's result.
5. The evals doc says "the maintainer", matching the evals `CLAUDE.md`.
6. The runtime record has six lines (the spec lists four), adding the codex
   binary path and the `verdict-normalize` blob, and the end record is written
   on every exit after the start record.
7. Files beyond the spec's list: hyperpowers
   `tests/codex-review-gate/gate-post-split-edits.tsv` (Task 6, which did not
   run), `scripts/codex-focus-arm.test.sh`, `fixtures/codex-focus-arm/P2/`,
   `evidence/2026-10-03-harness-confound-attribution/hermeticity-be020f0d0.txt`,
   and this directory's `cap-sentence.txt`, `tally.py`, `tally.txt` and
   `README.md`.

From execution:

- **Task 1's text departs from the plan's Step 2 in four places.** Four rounds
  of Task 1's Codex gate found defects in the §5 text the plan mandated. The
  human partner ruled on each, and the plan and spec carry appended
  corrections (hyperpowers `cc1af48`, `cb67114`, `cd67425`, `760e455`). The
  evals commits are `93777fbbf`, `81b24c0b1`, `9a53cb272` and `ed220c9cc`.
- **The sandboxed probe went to scratch.** The plan allows one sandboxed launch
  per session before running unsandboxed. That launch wrote to a scratch
  directory, not to `task-4-runs/`. It failed on the sandbox ("no broker
  endpoint", exit 1) before any review, and its two records were identical to
  each other and leak-free. It is not part of this evidence. Both counted
  invocations ran unsandboxed.
- **A second leak scan.** Inside the Bash sandbox, the proxy variables the
  plan's leak grep reads hold the sandbox proxy's values, not the host's. Every
  staged diff was therefore also scanned for the host's values by a
  counts-only scanner. Both scans found nothing.
- **The experiment entry's labels.** The plan's Grounding describes the
  attribution entry as "Question, Pre-registration, Config, Results, Limits,
  Files", but that entry is written as Hypothesis, Config, Run pointers,
  Verdict and Limits. This plan's entry uses the plan's labels, in that
  entry's bold lead-in style.
- **No `task-5-runs/`.** Global Constraints lists it in this directory; on the
  Stop path it does not exist.
