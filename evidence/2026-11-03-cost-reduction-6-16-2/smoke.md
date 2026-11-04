# Smoke run: control arm, scenario sdd-compaction-reread, proc p90

Model `claude-opus-5-5`, Claude Code 2.1.317, control checkout v6.16.1
(`f1fd935`). Logs: `logs/attempt-1/`, `logs/attempt-2/`, `logs/control-sdd-compaction-reread-p90.log`
(attempt 3), and `logs/infra-1/` (a sandbox failure, not an attempt). Runs are under `task-7-runs/smoke/`
(record under `<run>/`, home under `workspaces/<run>/`).

## Result

Both spec assumptions are satisfied under the spec's validity rule: "a compaction lands after task 1's task review
returns and before the final review is dispatched". The tally (commit 0f5841384) measures the first automatic
compaction inside that window. Attempt 3 (27 KB plan, harness pin 829fe83b0, run
`sdd-compaction-reread-claude-auto-20261104T193744Z-25e5`) reads valid.

Tally lines (`tally.py --run <id> --arm smoke`):

| Attempt | Tally line |
| --- | --- |
| 1 | `void=- outcome=True mechanism=False dispatches=implement:4,review:4,rereview:1,fix:0,final:1,other:0` |
| 2 | `void=- outcome=True mechanism=False dispatches=implement:4,review:4,rereview:3,fix:0,final:1,other:0` |
| 3 | `void=- outcome=True mechanism=False dispatches=implement:4,review:4,rereview:0,fix:0,final:1,other:0` |

Mechanism is False on the control arm, the expected control reading (SDD is not re-read after the compaction).

Truncation: in every compaction of every attempt, the post-compaction `invoked_skills` attachment carries
`hyperpowers:subagent-driven-development` at exactly 20000 characters ending
`[... skill content truncated for compaction; use Read on the skill path if you need the full text]`.

Everything below this section is attempt history. The "first compaction" columns, the void readings and the
"not met" conclusion are superseded readings under the plan's narrower first-compaction rule, which the controller
replaced with the spec's rule (tally commit 0f5841384).

## Attempt history (superseded readings)

Superseded window rule (plan's narrower version): the first automatic compaction must fall after review 1 returns and before the final review is dispatched.

| Attempt | Run id | Harness pin | plan.md | Duration | DONE line | Compactions | First compaction position | Superseded tally (first-compaction rule) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| infra-1 | `...20261104T184628Z-9160` | 630d03335 | 64 KB | 2 s | DONE, but `indeterminate` (setup: `git init` could not copy hook samples, sandbox) | n/a | n/a | not counted; re-run with the sandbox off |
| 1 | `sdd-compaction-reread-claude-auto-20261104T184644Z-37a4` | 630d03335 | 64,285 B | 18 min | DONE | 3 | before the first dispatch (after plan reads, 71.8k tokens) | void=instrument |
| 2 | `sdd-compaction-reread-claude-auto-20261104T190704Z-b615` | e0605602b | 41,612 B | 29 min | DONE | 5 | before the first dispatch (66.7k tokens) | void=instrument |
| 3 | `sdd-compaction-reread-claude-auto-20261104T193744Z-25e5` | 829fe83b0 | 27,595 B | 16 min | DONE | 4 | before the first dispatch (67.8k tokens); a second one followed review 1 | void=instrument |

All three trials passed quorum (`final pass`, 3 post-checks) and the Gauntlet-Agent, and finished with the
finishing skill. Under the superseded first-compaction rule the tally marked each run void (instrument) because the
first compaction precedes review 1's completion; the Result section replaces that reading. Dispatch classes in attempt 3 (main transcript): 4 implement, 4 review, 1 final, no re-review.

## Why the plan size did not move the first compaction (history)

Controller context before the first dispatch (attempt 3, 27 KB plan): 21k tokens at the SDD skill call, 36k after the
preflight read, 48k after the plan, 53k after the communication skill and a plan question, 61k after reading
the requesting-code-review material and gate docs, 66k at the first dispatch. The auto-compact threshold sits at
about 66.7k. The fixed pre-dispatch reads (system prompt and hooks, the SDD skill, review and gate
documents) take about 36k tokens plus about 20k of preflight reading, so almost none of the 31k headroom is left for the
plan, whatever its size. Shrinking the plan 64 KB to 27 KB moved the first compaction by almost nothing.

## Truncation check (spec assumption 2): holds (same finding as in Result)

In every compaction of every attempt, the `invoked_skills` attachment after `compact_boundary` carries
`hyperpowers:subagent-driven-development` at exactly 20000 characters, ending
`[... skill content truncated for compaction; use Read on the skill path if you need the full text]`.
Attempt 3 also shows `hyperpowers:communication` at 7381 characters (untruncated).

## Superseded: compaction window reading under the first-compaction rule

Superseded conclusion, replaced by the Result section: under the first-compaction rule the window was not met in any of the three attempts, because the first compaction lands before the first implementer dispatch every time; a later compaction does land in the window.

## Re-tally under the spec's validity rule (same lines as in Result)

The spec's rule is that a trial is valid when a compaction lands after task 1's review returns and before the
final review is dispatched. The tally now measures the first automatic compaction inside that window; earlier
compactions (here, the one before the first dispatch) no longer void a run. The table above records the
first-compaction reading the tally had at the time; the lines below are the tally's output after the change.
The attempt 1 "fix" dispatch mentioned in the task report was a re-review; the tally finds no fix dispatches.

| Attempt | Tally line (after the change) |
| --- | --- |
| 1 | `void=- outcome=True mechanism=False dispatches=implement:4,review:4,rereview:1,fix:0,final:1,other:0` |
| 2 | `void=- outcome=True mechanism=False dispatches=implement:4,review:4,rereview:3,fix:0,final:1,other:0` |
| 3 (27 KB plan, harness 829fe83b0) | `void=- outcome=True mechanism=False dispatches=implement:4,review:4,rereview:0,fix:0,final:1,other:0` |

Attempt 3 reads valid, so spec assumption 1 is satisfied for the latest fixture: the window is reached by a later
compaction, not the first. Mechanism is False on the control arm in all three, which is the expected control reading
(SDD is not re-read after the compaction).
