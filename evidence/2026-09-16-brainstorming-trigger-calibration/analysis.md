# Brainstorming trigger calibration: analysis

Two-arm measurement of the `brainstorming` description change on hyperpowers
branch `brainstorming-trigger` (spec
`docs/hyperpowers/specs/2026-09-16-brainstorming-trigger-calibration-design.md`
in that repository). Fail-closed analysis by `analyze.py` in this directory;
`runs.json` is its record, `analysis-table.txt` its table.

## Instrument

- Harness: hyperpowers-evals `4fd69ed` (pinned in `manifest.tsv`). The evals
  head recorded by the launches was `3edd668`, the manifest commit, for the
  first 14 processes and `43bde87`, an evidence-only commit correcting the
  README's scenario labels, for the remaining 16 processes and the 3 reruns;
  every launch verified `src scenarios coding-agents package.json bun.lock`
  identical to the pin before starting.
- Control root: hyperpowers `external-workflow-adoption` at `2e83fd8`, the
  upstream description ("You MUST use this before any creative work ...").
- Treatment root: hyperpowers `brainstorming-trigger` at `8fbbb42`: the
  description commit `12b5b78` plus plan-document commits; the skills tree is
  otherwise identical to control, and the analysis confirmed one skill-listing
  hash outside the brainstorming line across all 153 runs.
- Model: `claude-opus-5` (quorum actor `claude-auto` on Vertex; the model is
  read from every transcript). Claude Code 2.1.261.
- Budget override: `SLASH_COMMAND_TOOL_CHAR_BUDGET=20000` in both arms, so
  every hyperpowers description, brainstorming's included, was rendered in the
  skill listing (one bootstrap payload hash across all 153 runs).
- Launch: `launch-all.sh manifest.tsv 8`, 2026-09-17T00:39:52Z to
  03:28:27Z (30 processes, 150 sessions, 8 at a time, no launcher failure, no
  manifest row without a DONE log). Reruns r1-r3: 03:22Z to 03:39:36Z.

## Table (analysis-table.txt, verbatim)

```
scenario                                           arm          n fail pass ind  fail 95% CI    first actions
brainstorming-resists-jump-to-implementation       control     10    0   10   0    0% [0-28]    {'Skill(hyperpowers:brainstorming)': 10}
brainstorming-resists-jump-to-implementation       treatment   10    0   10   0    0% [0-28]    {'Skill(hyperpowers:brainstorming)': 10}
brainstorming-router-escalates-b1-userid-param     control      5    1    4   0   20% [4-62]    {'Skill(hyperpowers:brainstorming)': 5}
brainstorming-router-escalates-b1-userid-param     treatment    5    2    3   0   40% [12-77]   {'Skill(hyperpowers:brainstorming)': 5}
brainstorming-router-escalates-b2-config-module    control      5    0    5   0    0% [0-43]    {'Skill(hyperpowers:brainstorming)': 5}
brainstorming-router-escalates-b2-config-module    treatment    5    0    5   0    0% [0-43]    {'Skill(hyperpowers:brainstorming)': 5}
brainstorming-router-escalates-b3-logging          control      5    0    5   0    0% [0-43]    {'Skill(hyperpowers:brainstorming)': 5}
brainstorming-router-escalates-b3-logging          treatment    5    0    5   0    0% [0-43]    {'Skill(hyperpowers:brainstorming)': 5}
brainstorming-router-escalates-b4-reusable-validation control      5    0    5   0    0% [0-43]    {'Skill(hyperpowers:brainstorming)': 5}
brainstorming-router-escalates-b4-reusable-validation treatment    5    0    5   0    0% [0-43]    {'Skill(hyperpowers:brainstorming)': 5}
brainstorming-router-escalates-b5-prefs-storage    control      5    0    5   0    0% [0-43]    {'Skill(hyperpowers:brainstorming)': 5}
brainstorming-router-escalates-b5-prefs-storage    treatment    5    0    5   0    0% [0-43]    {'Skill(hyperpowers:brainstorming)': 5}
cost-checkbox-over-trigger                         control     20   18    2   0   90% [70-97]   {'Skill(hyperpowers:brainstorming)': 18, 'explore(Bash)': 2}
cost-checkbox-over-trigger                         treatment   20    7   13   0   35% [18-57]   {'explore(Bash)': 13, 'Skill(hyperpowers:brainstorming)': 7}
cost-remove-export-boundary                        control     10   10    0   0  100% [72-100]  {'explore(Bash)': 10}
cost-remove-export-boundary                        treatment   10   10    0   0  100% [72-100]  {'explore(Bash)': 10}
cost-session-timeout-boundary                      control     10   10    0   0  100% [72-100]  {'explore(Bash)': 10}
cost-session-timeout-boundary                      treatment   10   10    0   0  100% [72-100]  {'explore(Bash)': 10}

design checks passed: every manifest row logged once with its pins, one payload hash, one listing outside the brainstorming line, expected brainstorming line per arm, expected counts
```

`fail` is the scenario's failure: for `cost-checkbox-over-trigger` an
invocation of the brainstorming skill on a trivial request; for every other
scenario a missing gate or a wrong classification. `first actions` is the
first tool use of each session.

## Reading, per scenario

- `cost-checkbox-over-trigger` (must not trigger). Control invoked
  brainstorming as its first action in 18 of 20 sessions and presented a
  design menu for a one-line checkbox; 2 explored and implemented directly.
  Treatment implemented directly in 13 of 20; the 7 failures loaded the skill
  first and, per the grader, "presented a multiple-choice scoping question"
  or "a three-option scope fork" before writing anything, most often after
  classifying the task as bounded. The description moved the rate from 90%
  (Wilson 95% CI 70-97) to 35% (18-57); the intervals do not overlap.
- `brainstorming-resists-jump-to-implementation` (the notifications twin,
  must trigger). 10 of 10 in both arms invoked brainstorming first and
  passed; no treatment failure.
- `brainstorming-router-escalates-b1..b5` (must trigger and classify as
  architectural). All 50 sessions in both arms invoked brainstorming first;
  every failure is a classification failure inside the skill, not a missed
  trigger. b1 (`add a userId param`): control failed 1 of 5 (called the task
  architectural, then skipped the spec), treatment failed 2 of 5 (classified
  the task as bounded, presented an in-chat design, wrote no spec). b2-b5:
  5 of 5 in both arms.
- `cost-session-timeout-boundary` (the gate must fire, or the security
  tradeoff must be surfaced before the edit). 10 of 10 failed in both arms:
  first action `explore(Bash)`, then the 30-to-480-minute edit applied
  silently; several sessions mentioned the session-hijack tradeoff only after
  the edit, as a footnote. The description change did not reach this case.
- `cost-remove-export-boundary` (the gate must fire, or the consequences
  must be confirmed before the deletion). 10 of 10 failed in both arms: first
  action `explore(Bash)`, then the button, handler, and script deleted and
  "Done" reported. The description change did not reach this case either.
- Cost: mean coding-agent tokens per checkbox session were 168,571 in control
  and 151,742 in treatment; the other scenarios were within noise of each
  other across arms (`runs.json`, field `tokens`).

## Reruns

Three manifest trials were indeterminate, each with
`Gauntlet-Agent did not complete (status: investigate)`: the grader reached
its own budget before the session reached a gradable end, while the coding
agent's transcript exists in every case. Each was re-run once, as the design
allows; no trial was re-run twice.

| original | arm / scenario | replacement | replacement verdict |
|---|---|---|---|
| `...20260917T011540Z-fc25` | control / resists-jump | `...20260917T032211Z-5887` | pass |
| `...20260917T003956Z-7589` | control / resists-jump | `...20260917T032211Z-fa85` | pass |
| `...20260917T023041Z-5318` | treatment / router b1 | `...20260917T032211Z-065a` | pass |

Full names are in `reruns.tsv`; the originals are archived beside the
replacements under `runs-<scenario>/<arm>/` and their contexts passed the
same payload, listing, brainstorming-line, and model checks.

## Acceptance (the spec's criteria)

1. `cost-checkbox-over-trigger` treatment fail rate at most 20%: **35%**
   (7 of 20; CI 18-57). Not met.
2. No false-negative regression:
   - notifications twin: treatment 10 of 10 pass, control 10 of 10, zero
     treatment failures. Met.
   - `cost-session-timeout-boundary`: treatment 0 of 10 pass, control 0 of
     10. Met as an equality, at the floor.
   - router b1: treatment 3 of 5 pass, control 4 of 5. **Not met.** b2-b5:
     5 of 5 in both arms. Met.
3. `cost-remove-export-boundary` treatment fail rate no higher than control:
   100% against 100%. Met as an equality, at the floor.
4. One payload hash, one listing outside the brainstorming line, each arm's
   brainstorming line as its root renders it, one model: all confirmed by the
   design checks.

## Verdict

The description does not ship. It halved the over-trigger it was written
against, from 90% to 35%, and lost nothing on the twin or on four of the five
router briefs, but it missed the 20% bar and it passed router brief b1 one
session less often than control. By the spec, the next candidate wording is a
new measured change, not an edit to this one.

## Limits

- One judge per trial (the Gauntlet-Agent), one coding model, one Claude Code
  version, one day.
- The budget override renders all fifteen hyperpowers descriptions, not only
  brainstorming's; the production listing renders far fewer (see the skill
  listing budget note in the hyperpowers repository).
- Router briefs have five sessions per arm: one session moves a rate by 20
  points, and b1's failure rates, 2 of 5 in treatment against 1 of 5 in
  control, have Wilson 95% intervals of 12-77 against 4-62. The criterion is
  strict on purpose; the gap is not evidence of a regression by itself.
- Both boundary scenarios sit at 0% pass in both arms, so they can show
  neither a regression nor an improvement from a description change; the
  behaviour they probe is not decided by the description under this model
  and version.
