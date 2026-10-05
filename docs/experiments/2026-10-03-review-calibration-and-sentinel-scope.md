# 2026-10-03: Review calibration, the pathological-input cap (stopped at RED)

**Question.** Does the cap sentence move a pathological-input defect from
blocking to medium, without moving a defect that corrupts stored data, an
ordinary-input crash, an omitted requirement, or a clean diff?

The sentence, proposed for the three adversarial-review focus strings in
hyperpowers `skills/requesting-code-review/recipe-code.md`, follows "Naming,
style, and speculative hardening are low.":

> A defect reachable only through input that nothing in the code or its
> callers produces and that only the person running it could supply — a
> newline or invalid UTF-8 in a file or directory name, a name that starts
> with a dot — is medium, unless it also breaks the default path or corrupts
> stored data.

It answers the third-pass gate on the external-workflow-adoption branch,
which blocked on defects that only hand-made input reached: invalid UTF-8 in
a path, a newline in a plan directory name, a dot-prefixed workspace a glob
skipped. Before the treatment could run, the control focus had to reproduce
that over-rating: block the pathological fixture in at least 2 of 3 reviews.

**Pre-registration.** Hyperpowers plan
`docs/hyperpowers/plans/2026-10-03-review-calibration-and-sentinel-scope.md`
and its spec, committed in hyperpowers `c7f4063` before the first review.
The decision rule, quoted from the plan's Global Constraints:

> The treatment wins if all five hold: P blocks in at most 1 of 3; Pc blocks
> in at least 2 of 3; H blocks in 3 of 3; O blocks in 3 of 3; M is approved
> in at least 2 of 3. "P" means the validated pathological fixture: P, or P2
> if P was revised in Task 4. Control's numbers are reported beside the
> treatment's. A loss on any line means the sentence does not ship as
> measured, and the result goes back to the human partner.

The RED order came first: if control blocked P in at most 1 of 3, run the
revision P2, committed with the runner in `fd1b5c701` before any review. If
P2 also blocked in at most 1 of 3, stop: no sentence ships without a
reproduced over-rating.

**Config.**
- **Reviewer.** Codex `gpt-5.6-sol` at `model_reasoning_effort = "xhigh"`,
  codex-cli 0.160.0, through the codex-plugin-cc companion 1.0.6
  (`adversarial-review --base <base> --json <focus>`). Every capture was
  normalized by hyperpowers `verdict-normalize` blob `7111b3b5`, the one at
  `5bef46c` (v6.15.0).
- **Prompt.** The correctness-lens skeleton of a round-1 task gate, then the
  control focus: `recipe-code.md` line 53 at `5bef46c`, with its path
  placeholders pointed at the fixture's `REQUIREMENTS.md` and `review.diff`.
  As in the 2026-09-05 calibration runs, `review.diff` stands in the dossier
  slot.
- **Fixtures.** P: a report that writes each workspace directory name plus a
  newline, and a count over that report's lines, so a name with a newline
  counts twice. P2: the report prints the first seven characters of a
  twelve-hex-digit match and throws on any other name. The library creates
  only twelve-hex-digit names, and both fixtures' requirements say so.
- **Runner.** `scripts/codex-focus-arm.sh` at `fd1b5c701`: three sequential
  reviews per fixture, one broker per invocation keyed to a fresh temp
  directory, and a six-line runtime record before the broker starts and on
  exit.
- **Window.** control-P 2026-10-05T00:00:46Z to 00:02:55Z, control-P2
  00:07:33Z to 00:10:15Z, both unsandboxed. One sandboxed probe before them
  failed on the sandbox before any review and is not counted.

**Results.** Stopped at RED. No over-rating reproduced on P or P2 under
control; no sentence ships.

| Fixture | Control blocks | Control approved | Treatment |
|---|---|---|---|
| P | 0/3 | 3/3 | treatment did not run |
| P2 | 0/3 | 3/3 | treatment did not run |

- **No review reported the defect at any severity.** All six verdicts are
  `approve` with no findings. One P2 summary says the functions produce the
  required results "under the stated workspace-name invariant".
- **Not run.** Pc, H, O and M, and the treatment arm. `recipe-code.md` is
  unchanged.
- **Clean run.** No voids and no re-runs. Both invocations exited 0 with
  empty stderr, and all four runtime records are byte-identical to the
  reference.

**Limits.**
- **The requirements state the invariant.** Both fixtures' `REQUIREMENTS.md`
  say workspace directories are created only by `createWorkspace` with twelve
  hex digits, and one review relied on that sentence by name. The production
  gate that over-rated had a full dossier and no such statement. Whether that
  sentence suppressed the finding, and whether a fixture without it would
  reproduce the over-rating, is untested.
- **Production shape.** `review.diff` stands in the dossier slot instead of a
  real review dossier, so the reviewer saw less context than the third-pass
  gate did.
- **Boundaries.** Pc, the stored-data exception, never ran. The "breaks the
  default path" exception and input from an untrusted party have no fixture.
- **Scope.** One Codex model, one lens skeleton, three reviews per cell. A
  stop at 0 of 3 on two fixtures says the over-rating does not reproduce on
  this instrument, not that the production gate never over-rates.

**Files.**
- `evidence/2026-10-03-review-calibration-and-sentinel-scope/`: the README,
  the three focus inputs, `tally.py`, `tally.txt`, and
  `task-4-runs/control-P/` and `task-4-runs/control-P2/` (captures, run logs,
  broker records, runtime records).
- `scripts/codex-focus-arm.sh`, `scripts/codex-focus-arm.test.sh` and
  `fixtures/codex-focus-arm/{P,P2,Pc}/`, committed in `fd1b5c701`.
- The same plan's Fixes 2 and 3 (scoped sentinel re-measurement, base-rate
  rows labeled by harness) are documentation in `docs/scenario-authoring.md`
  §5: `8f8b6c526`, corrected in `93777fbbf`, `81b24c0b1`, `9a53cb272` and
  `ed220c9cc`.
- Hyperpowers note:
  `docs/hyperpowers/2026-10-03-review-calibration-and-sentinel-scope-eval-evidence.md`.
