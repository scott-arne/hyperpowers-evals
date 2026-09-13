# 2026-09-10 external workflow adoption — eval evidence

Arms of a before/after comparison over four live scenarios.

- `task-8-runs/baseline/` — hyperpowers at the branch-point commit, before any
  A1-A10 prose exists.
- `task-9-runs/baseline-hardened/` — the same baseline re-run against the
  hardened fixture for the three scenarios Task 8 found could not discriminate
  (`code-review-flags-weakened-test`,
  `systematic-debugging-red-command-first`,
  `brainstorming-looks-up-facts-itself`). It supersedes `task-8-runs/baseline/`
  for exactly those three; Task 8's `code-review-precision-on-mixed-diff`
  result is unaffected and still stands.
- `task-19-runs/treatment/` — hyperpowers at the `external-workflow-adoption`
  branch head `d0a187d`. Only S1 ran: Task 9 settled S2, S3 and S4 as no-ships
  before this arm started. `task-19-runs/adjudication.md` holds the ship table,
  and `task-19-runs/sentinel-runs/` holds the two non-green runs from the
  sentinel regression batch against that head.

Each arm holds one copied run directory per trial plus a `measurements.md`
recording the per-trial measurement the evidence note tabulates. Run
directories are copies; the harness `results/` tree they came from is
gitignored and not preserved. Nothing in this directory is edited after the
evidence note cites it.
