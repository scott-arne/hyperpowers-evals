# Smoke run: control arm, scenario sdd-compaction-reread, proc p90

Model `claude-opus-5-5`, Claude Code 2.1.317, control checkout v6.16.1
(`f1fd935`). Logs: `logs/attempt-1/`, `logs/attempt-2/`, `logs/control-sdd-compaction-reread-p90.log`
(attempt 3), and `logs/infra-1/` (a sandbox failure, not an attempt). Runs are under `task-7-runs/smoke/`
(record under `<run>/`, home under `workspaces/<run>/`).

Window rule: the first automatic compaction must fall after review 1 returns and before the final review is dispatched.

| Attempt | Run id | Harness pin | plan.md | Duration | DONE line | Compactions | First compaction position | Tally |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| infra-1 | `...20261104T184628Z-9160` | 630d03335 | 64 KB | 2 s | DONE, but `indeterminate` (setup: `git init` could not copy hook samples, sandbox) | n/a | n/a | not counted; re-run with the sandbox off |
| 1 | `sdd-compaction-reread-claude-auto-20261104T184644Z-37a4` | 630d03335 | 64,285 B | 18 min | DONE | 3 | before the first dispatch (after plan reads, 71.8k tokens) | void=instrument |
| 2 | `sdd-compaction-reread-claude-auto-20261104T190704Z-b615` | e0605602b | 41,612 B | 29 min | DONE | 5 | before the first dispatch (66.7k tokens) | void=instrument |
| 3 | `sdd-compaction-reread-claude-auto-20261104T193744Z-25e5` | 829fe83b0 | 27,595 B | 16 min | DONE | 4 | before the first dispatch (67.8k tokens); a second one followed review 1 | void=instrument |

All three trials passed quorum (`final pass`, 3 post-checks) and the Gauntlet-Agent, and finished with the
finishing skill, but the tally marks each run void (instrument) because the first compaction precedes review 1's
completion. Dispatch classes in attempt 3 (main transcript): 4 implement, 4 review, 1 final, no re-review.

## Why the plan size did not move the first compaction

Controller context before the first dispatch (attempt 3, 27 KB plan): 21k tokens at the SDD skill call, 36k after the
preflight read, 48k after the plan, 53k after the communication skill and a plan question, 61k after reading
the requesting-code-review material and gate docs, 66k at the first dispatch. The auto-compact threshold sits at
about 66.7k. The fixed pre-dispatch reads (system prompt and hooks, the SDD skill, review and gate
documents) take about 36k tokens plus about 20k of preflight reading, so almost none of the 31k headroom is left for the
plan, whatever its size. Shrinking the plan 64 KB to 27 KB moved the first compaction by almost nothing.

## Truncation check (spec assumption 2): holds

In every compaction of every attempt, the `invoked_skills` attachment after `compact_boundary` carries
`hyperpowers:subagent-driven-development` at exactly 20000 characters, ending
`[... skill content truncated for compaction; use Read on the skill path if you need the full text]`.
Attempt 3 also shows `hyperpowers:communication` at 7381 characters (untruncated).

## Compaction window (spec assumption 1): not met

Not met in any of the three attempts. The first compaction lands before the first implementer dispatch every time.
