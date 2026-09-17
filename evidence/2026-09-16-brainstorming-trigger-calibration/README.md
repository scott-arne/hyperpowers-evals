# Brainstorming trigger calibration (2026-09-16)

Two-arm measurement behind the `brainstorming` description change on the
hyperpowers branch `brainstorming-trigger` (spec:
`docs/hyperpowers/specs/2026-09-16-brainstorming-trigger-calibration-design.md`
in that repository). Both arms run with `SLASH_COMMAND_TOOL_CHAR_BUDGET=20000`
so the description is in the model's context, at the one harness commit
`manifest.tsv` records.

- `control`: `SUPERPOWERS_ROOT` at hyperpowers `external-workflow-adoption`
  (`2e83fd8`), the current description.
- `treatment`: `SUPERPOWERS_ROOT` at hyperpowers `brainstorming-trigger`
  after the description commit (the `treatment` row of `manifest.tsv`).

Scenarios: `cost-checkbox-over-trigger` (must not trigger);
`cost-remove-export-boundary` and `cost-session-timeout-boundary` (the gate
must fire, or the consequence must be surfaced and confirmed, before the
edit); `brainstorming-router-escalates-b1..b5` and
`brainstorming-resists-jump-to-implementation` (must trigger). Every trial
is declared in `manifest.tsv`; `launch-all.sh` runs it; `analyze.py`
refuses to report unless the observed runs match the manifest exactly.
Indeterminate trials re-run once, recorded in `reruns.tsv`. Logs under
`logs/`, run copies under `runs-<scenario>/<arm>/`, the analysis in
`analysis.md` and `analysis-table.txt`. The analysis resolves each run from the log's recorded results/ path and falls back to the archive under runs-<scenario>/<arm>/ when that path is gone, so the committed directory recomputes its own table. Each arm's expected brainstorming line is read from the manifest's root commit with git show, not from the checkout, so the roots' later commits (the description was reverted on the treatment branch after the measurement) do not change the analysis.
