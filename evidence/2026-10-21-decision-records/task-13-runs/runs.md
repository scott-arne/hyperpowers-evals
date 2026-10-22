# Task 13 runs

Every run is `bash run-finishing.sh <run>` with the environment shown. The
launcher grew parameters between runs; the table says which behaviour each run
had. Model claude-opus-5-5, Claude Code 2.1.302, plugin
`/Users/johnss51/Development/agents/hyperpowers/.worktrees/decision-records`
(the worktree at the head named in the evidence note when the run was made).

| Run | Command | SUITE_SLEEP | PAD_LINES | UNDOCUMENTED | Ancestor excludes written | Turns |
|---|---|---|---|---|---|---|
| fast | `SUITE_SLEEP=0 bash run-finishing.sh fast` | 0 | none (0) | 0 | no (launcher before the parameter existed) | 2 |
| slow | `SUITE_SLEEP=150 bash run-finishing.sh slow` | 150 | none (0) | 0 | no (launcher before the parameter existed) | 2 |
| fast2 | `SUITE_SLEEP=0 bash run-finishing.sh fast2` | 0 | none (0) | 0 | no (launcher before the parameter existed) | 2 |
| stop | `SUITE_SLEEP=0 PAD_LINES=5000 bash run-finishing.sh stop` | 0 | 5000 | 0 | yes | 2 |
| slow-clean | `SUITE_SLEEP=150 EXCLUDE_ANCESTORS=1 bash run-finishing.sh slow-clean` | 150 | none (0) | 0 | yes | 3 |
| slow-clean2 | `SUITE_SLEEP=150 EXCLUDE_ANCESTORS=1 UNDOCUMENTED=1 bash run-finishing.sh slow-clean2` | 150 | none (0) | 1 (case-insensitive tag matching, a choice the spec lacks) | yes | 3 |

The first three runs' sessions carried the host user-level CLAUDE.md
(see their status.txt). To reproduce them with the current launcher use
`EXCLUDE_ANCESTORS=0 TURNS=2`. Runs made after the Step 4 amendment
(`slow-clean`) load the amended skill; the earlier four ran the text before
it. Their status.txt files carry no `config:` line; slow-clean's first line
does.
