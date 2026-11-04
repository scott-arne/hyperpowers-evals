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
  often as the control's, with the mechanism shown as the spec states.

## Pins

| Pin | Value | Source |
| --- | --- | --- |
| harness | `630d03335915ae8f02ad70fc49f6d54d68c986f6` | Task 4's scenario plus its fix commit; harness paths (`src scenarios coding-agents package.json bun.lock`) must stay identical to it |
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
bash evidence/2026-11-03-cost-reduction-6-16-2/launch-all.sh \
  evidence/2026-11-03-cost-reduction-6-16-2/manifest-red.tsv 14 \
  > evidence/2026-11-03-cost-reduction-6-16-2/logs/launch-red.out 2>&1
```

`manifest-red.tsv` is the control arm and `manifest-green.tsv` the treatment
arm. One trial per row; the ten SDD rows are listed first so the longer
trials start first.

## Tallying

```bash
python3 evidence/2026-11-03-cost-reduction-6-16-2/tally.py
```

`tally.py --run RUN_ID --arm ARM --scenario NAME` tallies a single run (the
smoke).

## Replacements

A void trial (launch, setup, grader or instrument) may be replaced by a
relaunch recorded in `sentinel-reruns.tsv` (original proc, replacement proc;
tab separated), with replacement procs `r1` to `r3`. At most three
replacements per arm and scenario; `tally.py` exits 1 when a rule is broken.
