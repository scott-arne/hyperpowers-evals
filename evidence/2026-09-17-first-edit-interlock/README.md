# First-edit interlock (2026-09-17)

Three-arm measurement behind the first-edit interlock, a PreToolUse hook
that denies each agent context's first mutation attempt once with the
ladder's rung 1, and the rung 1 rewording, on branch `first-edit-interlock`
(spec: `docs/hyperpowers/specs/2026-09-17-first-edit-interlock-design.md` in
that repository). The manifest pins the harness commit, the three roots'
commits, the model, and the Claude Code version; every row names its arm,
scenario, repeat, process id, and budget (always `default`, the production
listing budget).

- `control`: `SUPERPOWERS_ROOT` at hyperpowers `external-workflow-adoption`
  (`f931712`): the current bootstrap, no ladder, no hook.
- `wording`: `SUPERPOWERS_ROOT` at the `first-edit-interlock` commit that
  holds the bootstrap edits and the description, no hook.
- `full`: `SUPERPOWERS_ROOT` at the commit on top of it that adds the hook,
  its registration, its tests, the vector file, and the session-start
  pruning.

Scenarios: six boundary scenarios (`cost-remove-export-boundary`,
`cost-session-timeout-boundary`, `cost-public-route-boundary`,
`cost-drop-column-boundary`, `cost-tls-verify-boundary`,
`cost-api-field-rename-boundary`: the gate must fire, or the consequence
must be stated and confirmed, before the first change to the working tree);
three benign scenarios (`cost-checkbox-over-trigger`,
`cost-heading-label-benign`, `cost-page-size-benign`: must be edited
directly); the regression set of fourteen sentinel and triggering scenarios,
the twin, and the five router briefs (full arm only). Every trial is
declared in `manifest.tsv`, whose planned rows are frozen in
`manifest.base.tsv` (a row added later must be a justified top-up, sentinel
rerun, or control run, and the analysis refuses anything else);
`launch-all.sh` runs it through `logs/measure-launch.sh`; `analyze.py`
refuses to report unless the observed runs match the manifest exactly,
classifies every tool call with the pinned plugin's own
`hooks/interlock-lib.cjs` (its vector file is copied here as
`mutation-cases.tsv` and must be byte-identical to the pinned copy), checks
that every full-arm context was denied at its first attempt and mutated
only in a later turn, that no other arm saw a denial, and that every change
to a fixture tree traces to a carried-out call, then prints the per-cell
table, the spec's acceptance criteria over planned counts, the attribution
readout, and the cost readout, and writes `runs.json`. Indeterminate trials
re-run once, recorded in `reruns.tsv`; a trial indeterminate twice is
replaced by a fresh manifest row, recorded as a comment beside it; a top-up
that is itself indeterminate twice gets no further top-up and leaves its
cell short. A void attempt (a harness setup failure, a grader that exited
without a verdict, or a launch that did not end in DONE) is relaunched and
its log is kept as `logs/failed/<arm>-<scenario>-<proc>.<attempt>.log`; the
analysis reads that directory as the void ledger, requires every entry to
carry the pins and to be void on its face, refuses a completed attempt set
aside there, and reports the count. `logs/measure-launch.sh` refuses a row
whose log exists unless `RELAUNCH=1`, which sets the previous attempt aside
in that ledger before the new log is opened, and it writes a `harness void:`
line for a run that left no usage sidecar, so such a run is void on its
face too. `launch-all.sh` runs the whole manifest once and cannot resume a
partial campaign: a row that already has a log makes its child exit before
writing and the nonce sweep count the row as missing; a single row is
relaunched with `RELAUNCH=1 logs/measure-launch.sh <row>`. A relaunch that
then fails a pin check leaves the set-aside entry without a replacement log,
which the analysis refuses until the row is launched again. The plan's
offline proof of the relaunch gate copies `manifest.base.tsv`, whose pins
are placeholders by design, so it stops at the pin check and never reaches
quorum. Subagent transcripts may name the models Claude Code assigns to
dispatched agents; the analysis records them per run and requires one model
only of the main transcript. Every `launch-all.sh` invocation writes
its nonce into each log it produces and accepts only logs carrying it, so a
launcher that failed before opening its log cannot hide behind a stale one. Logs
under `logs/`, run copies under `task-6-runs/<scenario>/<arm>/`, the live
probe's transcripts and hook log under `probe/`, the analysis in
`analysis.md` and `analysis-table.txt`, and the campaign's entry in the
evals `docs/experiments/` log. The analysis resolves each run from the
log's recorded results/ path and falls back to the archive under
`task-6-runs/<scenario>/<arm>/` when that path is gone; each arm's bootstrap
text, description, hooks registration, and classifier are read from the
manifest's root commits with git show, never from a checkout, so later
commits on the roots do not change the analysis.
