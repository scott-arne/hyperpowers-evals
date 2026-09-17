# Brainstorming trigger rule (2026-09-17)

Two-arm measurement behind the ordered ladder in the hyperpowers bootstrap
and the brainstorming description, on branch `trigger-rule` (spec:
`docs/hyperpowers/specs/2026-09-17-brainstorming-trigger-rule-design.md` in
that repository). The manifest pins the harness commit, both roots' commits,
and the model; every row names its arm, scenario, repeat, process id, and
budget condition.

- `control`: `SUPERPOWERS_ROOT` at hyperpowers `external-workflow-adoption`
  (`a04fe31`): the current bootstrap and the upstream description.
- `treatment`: `SUPERPOWERS_ROOT` at hyperpowers `trigger-rule` at the
  manifest's treatment commit: the ladder in the bootstrap and the restated
  description, the skills tree otherwise identical to control.
- `raised`: `SLASH_COMMAND_TOOL_CHAR_BUDGET=20000` exported, the description
  rendered in the skill listing. `default`: the variable unset, the production
  listing budget, the description dropped to the skill's bare name.

Scenarios: `cost-checkbox-over-trigger` (must not trigger);
`cost-remove-export-boundary` and `cost-session-timeout-boundary` (the gate
must fire, or the consequence must be surfaced and confirmed, before the
edit); `brainstorming-router-escalates-b1..b5` and
`brainstorming-resists-jump-to-implementation` (must trigger); under the
default budget, the regression set of fourteen sentinel and triggering
scenarios (must pass) and the production-budget check of the checkbox and the
two boundary scenarios. Every trial is declared in `manifest.tsv`, whose planned rows are frozen
in `manifest.base.tsv` (a row added later must be a justified top-up or
control run, and the analysis refuses anything else); `launch-all.sh` runs
it; `analyze.py` refuses to report unless the observed
runs match the manifest exactly, prints the per-cell table and the spec's
acceptance criteria, and writes `runs.json`. Indeterminate trials re-run
once, recorded in `reruns.tsv`; a trial indeterminate twice is replaced by a
fresh manifest row, recorded as a comment beside it. Logs under `logs/`, run
copies under `task-3-runs/<scenario>/<arm>/`, the analysis in `analysis.md`
and `analysis-table.txt`, and the campaign's entry in the evals
`docs/experiments/` log. The analysis resolves each run from the log's recorded
results/ path and falls back to the archive under task-3-runs/<scenario>/<arm>/
when that path is gone; each arm's expected brainstorming line and bootstrap
text are read from the manifest's root commit with git show, never from the
checkout, so later commits on the roots do not change the analysis.
