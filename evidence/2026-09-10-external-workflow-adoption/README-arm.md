# 2026-09-10 external workflow adoption — eval evidence

Two arms of a before/after comparison over four live scenarios.

- `task-8-runs/baseline/` — hyperpowers at the branch-point commit, before any
  A1-A10 prose exists.
- `task-19-runs/treatment/` — hyperpowers at the `external-workflow-adoption`
  branch head that ships.

Each arm holds one copied run directory per trial plus a `measurements.md`
recording the per-trial measurement the evidence note tabulates. Run
directories are copies; the harness `results/` tree they came from is
gitignored and not preserved. Nothing in this directory is edited after the
evidence note cites it.
