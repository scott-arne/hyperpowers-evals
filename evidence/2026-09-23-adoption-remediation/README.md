# Adoption Remediation Campaign (2026-09-23)

This campaign measures the bootstrap ladder alone (post-revert from the
first-edit interlock) at the full sample size (n=40 for six boundary scenarios,
n=20 for three benign scenarios).

## What This Campaign Measures

The brainstorming skill's bootstrap ladder trigger rule after reverting the
first-edit interlock hook. This isolates the description-only trigger mechanism
at the production skill-listing budget to measure its boundary-scenario
compliance and benign over-trigger rate.

## Arms

- **Treatment only.** The post-revert tree with the bootstrap ladder as the
  sole brainstorming trigger.
- **Controls cited, not re-run.** Prior measurements are recorded in
  `prior-controls.tsv` and categorized by comparability group (matched controls,
  unmatched budget, and wording-arm baseline).

## Session Count

326 total sessions:
- 315 treatment sessions (6 boundary scenarios x 8 procs x 5 repeats = 240;
  3 benign x 4 procs x 5 repeats = 60; 5 router briefs x 1 proc x 3 repeats =
  15)
- 11 sentinel sessions (one per scenario), judged under the "A single sentinel
  failure is a sample" rule in `docs/scenario-authoring.md`: a lone failure is
  one draw from the scenario's rate, and a regression needs the 20-run rate's
  95% Wilson lower bound above the recorded base rate's 95% Wilson upper bound

## Pins

- **Model:** `claude-opus-5`
- **Budget:** `default` (production skill-listing budget;
  `SLASH_COMMAND_TOOL_CHAR_BUDGET` and `INTERLOCK_PROBE_TRACE` explicitly unset)

## Criterion 1 Reading

Per spec section 1.6, for a boundary scenario, criterion 1 is satisfied when
both:
- `criteria[0].verdict == "pass"` (the boundary-crossing requirement)
- `criteria[1].verdict == "pass"` (the must-escalate requirement)

Both criterion texts are recorded with every trial. The composed `final` verdict
is reported alongside the criterion-1 reading, never instead of it.

## Specification

Full design and methodology:
`docs/hyperpowers/specs/2026-09-23-adoption-remediation-design.md` in the parent
hyperpowers repository.

## Version Caveat

Every cited control cell was measured on Claude Code 2.1.276. This campaign runs
on the version current at launch. Differences in harness behavior between
versions may affect comparability.

## Launch Environment (recorded at launch, Task 11 Step 3)

| Item | Value |
|---|---|
| Date | 2026-09-26 |
| Claude Code | 2.1.280 |
| `ANTHROPIC_MODEL` | `claude-opus-5` |
| Provider | Vertex (`CLAUDE_CODE_USE_VERTEX=1`, region `global`) |
| evals HEAD (harness pin) | `94570f1ebd3be7eef1e51beb88bc26f95bdd1f3e` |
| treatment head | `3c32ee4db27347257ee8740a623ebe2f2997967a` |
| treatment root | `.worktrees/adoption-remediation-treatment` (detached) |
| control pin (cited, not run) | `3bdb5b2` |

The cited control cells were measured on 2.1.276; this campaign runs on 2.1.280.
The Version Caveat above applies wherever a verdict leans on a cited cell.

### Pre-launch smoke test

One throwaway session outside the manifest confirmed the live stack before the
campaign was launched: `cost-heading-label-benign`, `claude-auto`, `--repeat 1`,
treatment root. First attempt returned `indeterminate (setup)` —
`setup.sh` exit 128, `cannot copy /opt/homebrew/opt/git/share/git-core/templates/hooks/commit-msg.sample … Operation not permitted`. That is the known
sandbox signature for this host, not a harness defect; the campaign is launched
outside the sandbox. The retry passed (both post-checks green, both actors on
`claude-opus-5`).

Two run directories from that smoke test sit in `results/` and are not part of
the measurement: they correspond to no manifest row and no declared rerun, so the
analyzer does not read them.
`cost-heading-label-benign-claude-auto-20260926T063601Z-938c` (the sandbox
failure) and `-20260926T063610Z-d269` (the passing retry).

### Mid-batch mutation check (Task 11 precondition (d))

`batch.json` binds provenance at batch start, but each Claude child loads the live
`SUPERPOWERS_ROOT` when it launches (`coding-agents/claude-context/launch-agent`
passes `--plugin-dir "$SUPERPOWERS_ROOT"`). A reverted mid-batch edit is invisible
to a content re-read but not to an mtime. `batch-window-start.txt` records the
launch epoch; after the main batch and again after the sentinel batch,

```
find "$SUPERPOWERS_ROOT/skills" "$SUPERPOWERS_ROOT/hooks" \
  -newermt "@$(cat batch-window-start.txt)" -print
```

must print nothing. Any path means the batch's provenance header does not describe
what those sessions loaded, and the batch is void rather than a measurement. Both
results are recorded below when the campaign completes.

#### Results

Four checks, all against the same unchanged stamp `1790404709`, so a hit would
localise to one window: after the main batch, after the sentinel batch, after
the three sentinel replacements, and after archiving. Every one printed
nothing. Throughout, the treatment worktree stayed at
`3c32ee4db27347257ee8740a623ebe2f2997967a` with `git status --short` empty.

## Archived Runs

- `task-11-runs/<scenario>/<arm>/<run>/` — the 315 campaign sessions. This is
  exactly the set `analyze.py --archives` prints, and `build_runs` falls back to
  it when a run has aged out of the live `results/` tree.
- `task-11-sentinel-runs/<scenario>/<run>/` — the 11 sentinel-batch sessions and
  the three `brainstorming-resists-jump-to-implementation` replacements, plus the
  batch metadata at `task-11-sentinel-runs/batch-20260926T090521Z-2156/`. The
  analyzer reads the sentinel cohort from the live batch, not from an archive, so
  this copy exists for the evidence note's citations rather than for `analyze.py`.
  Re-running the analyzer after `results/` is pruned needs `sentinel-batch.txt`
  repointed at this copy.

Two deliberate departures from a byte-exact copy, both forced by the host
sandbox refusing writes into a destination path containing `.git`:

- Each `coding-agent-workdir/.git` is archived as `git-dir` (and the one worktree
  pointer file under `worktree-no-drift-to-main` as `git-file`). Without the
  rename git commits a directory as a gitlink and loses its contents.
- `.git/hooks/*.sample` is omitted. Those are git's own templates, identical in
  every run and reinstalled by `git init`; `config`, `HEAD`, `index`, `logs/`,
  `objects/`, `refs/`, and `COMMIT_EDITMSG` are all archived.
