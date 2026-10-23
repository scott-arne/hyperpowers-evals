# 2026-10-20 portable SDD dossiers

Evidence for `docs/hyperpowers/plans/2026-10-20-portable-sdd-dossiers.md` (hyperpowers).
`rehearsal/`: clones of one bare repository standing in for hosts, driven by
`run-rehearsal.sh` against the plugin worktree; `check-rehearsal.sh` reads the outcomes.
Pass 0 runs in acceptEdits mode to observe the permission footing of writes under the
state checkout; passes 1 to 3 run with permissions skipped.
`rehearsal/control/` and `rehearsal/control-edit/` are the paired controls for that
footing: sessions in the default permission mode and with the tool allowed, each
writing (and, in `control-edit/`, then editing) the same file under a plain-cache
path and under a state-checkout path. `scenario-runs/`: the
`sdd-plan-scoped-scratch` quorum run on the new layout, stripped per `evidence/README.md`.
`choice/`: the live `test-worktree-native-preference.sh choice 3` output.
`choice/tooling-probe.jsonl` is one extra session on the same invocation, kept to
show that Bash reaches those sessions at all, so "nothing created" is a real check.
`offline/`: the per-suite logs of the offline set at the plan's Task 15 commit.
