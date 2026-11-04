# 6.16.2 re-read campaign

Paired measurement of whether the 6.16.2 change makes an agent re-read the
`subagent-driven-development` and `brainstorming` skills after an automatic
compaction. Spec:
`docs/hyperpowers/specs/2026-11-03-cost-reduction-6-16-2-design.md` in the
hyperpowers repository (Testing section). Savings are reported there as
percentages only.

Scenarios: `sdd-compaction-reread` (new) and
`brainstorming-bounded-companion-after-compaction` (gains a mechanism check).

Pass bar:

- SDD: the treatment passes all outcome checks in at least 8 of 10 valid
  trials and at least as often as the control, and shows the mechanism in at
  least 8 of 10.
- Brainstorming: the treatment's existing outcome checks pass at least as
  often as the control's, and the mechanism is shown in at least 8 of 10.

## Pins

| Pin | Value | Source |
| --- | --- | --- |
| harness | `829fe83b0c31a11ed1a09f9c771b4265fb56a94c` | Task 7's trimmed-plan scenario commit (supersedes 630d03335 and e0605602b); harness paths (`src scenarios coding-agents package.json bun.lock`) must stay identical to it |
| control | `f1fd935cbf79898430e4aac740b547c40d9c1103` | `v6.16.1`, detached worktree `/Users/johnss51/.cache/hyperpowers/cost-6162/hp-6161` |
| treatment | filled in Task 10 | release branch worktree `.worktrees/cost-6-16-2`; treatment rows are refused until it is filled |
| model | `claude-opus-5-5` | `ANTHROPIC_MODEL` must equal it in the launch shell |
| grader | `claude-opus-5-5` | `GAUNTLET_AGENT_MODEL` must equal it (`GRADER_PIN` in the launcher) |
| Claude Code | `2.1.317` | `CC_PIN` in `logs/measure-launch.sh`; the host's `claude --version` when the plan was written. Re-check before each campaign and update the pin here and in the script if the host has moved. |

`launch-all.sh` is copied unchanged from
`../2026-10-02-companion-default-window/`; `logs/measure-launch.sh` is adapted
from that campaign's copy (evidence directory, arm roots, CC pin). It checks
every pin before launching and writes `logs/<arm>-<scenario>-<proc>.log`,
whose last line is `DONE ...` or `FAILED <code> ...`.

## Launching a wave

Run from the evals clone, with the proxy variables, `ANTHROPIC_MODEL` and
`GAUNTLET_AGENT_MODEL` set as above:

```bash
bash evidence/2026-11-03-cost-reduction-6-16-2/launch-all.sh evidence/2026-11-03-cost-reduction-6-16-2/manifest-red.tsv 14 > evidence/2026-11-03-cost-reduction-6-16-2/logs/launch-red.out 2>&1; echo "exit=$?" > evidence/2026-11-03-cost-reduction-6-16-2/logs/launch-red.exit
```

The treatment wave is the same command with `manifest-green.tsv` and
`launch-green.out` / `launch-green.exit`. `manifest-red.tsv` is the control
arm and `manifest-green.tsv` the treatment arm. One trial per row; the ten SDD
rows are listed first so the longer trials start first. The launcher refuses
to start a row whose `logs/<arm>-<scenario>-<proc>.log` already exists.

## Tallying

```bash
python3 evidence/2026-11-03-cost-reduction-6-16-2/tally.py
```

`tally.py --run RUN_ID --arm ARM --scenario NAME` tallies a single run (the
smoke).

## Replacements

A void trial (launch, setup, grader or instrument) may be replaced by a
relaunch with proc `r1` to `r3`. `launch-all.sh` accepts only `p` procs, so
launch a replacement by calling `logs/measure-launch.sh` directly with
`MANIFEST` set to the wave's manifest, for example
`MANIFEST=$PWD/evidence/2026-11-03-cost-reduction-6-16-2/manifest-red.tsv bash evidence/2026-11-03-cost-reduction-6-16-2/logs/measure-launch.sh control sdd-compaction-reread 1 r1 default`.
At most three replacements per arm and scenario, and each needs its row in
`sentinel-reruns.tsv`: `<original run id><TAB><replacement run id>`, the
quorum run ids as `tally.py` reads them. `tally.py` exits 1 when a rule is
broken.

## First treatment wave

The first treatment wave (pin `1478a4a`) is archived under `logs/green-1/`
(its row logs and launcher output), with its tally, including the report-only
per-compaction lines, in `tally-green-1.txt`. The re-measure uses the
strengthened skill wording and writes fresh `logs/treatment-*.log` rows; the
copied wave-1 runs under `task-10-runs/treatment/` stay as committed history.
`tally.py` reads only `logs/*.log`, so it counts none of the archived runs.
