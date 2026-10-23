# Task 14 runs

Every run is `bash run-sdd.sh <run>` with the environment shown. Model
claude-opus-5-5, Claude Code 2.1.302, plugin
`/Users/johnss51/Development/agents/hyperpowers/.worktrees/decision-records`
at HEAD 3f9aca9. Every session also ran with `XDG_CACHE_HOME=$SCRATCH/cache`
(per run), `HYPERPOWERS_PLUGINS_FILE=/nonexistent` (the Codex preflight finds no
plugin, so the gates degrade) and the `claudeMdExcludes` settings file for every
ancestor of the working copy. `prompt-1.txt` is the brief's line plus one
sentence ("Work in place on the current branch; do not create a worktree.") so
the session does not stop at a worktree-consent question.

| Run | Command | Outcome |
|---|---|---|
| slow-void1 | `SUITE_SLEEP=120 bash run-sdd.sh slow` | void: fixture defect. The plan's `data/sample.txt` was read by nothing, so the session's plan scan stopped to ask about it in turn 1 (no implementer dispatched). The plan was revised so the test counts the file. |
| slow-void2 | `SUITE_SLEEP=120 bash run-sdd.sh slow` | void: fixture defect. The final review found a missing-file count printing nothing, a circular assertion and a stale usage string, all in the plan's own code; the session asked before a fix round and never reached Finish. The plan was revised (missing file prints 0, usage updated, literal 5000 assertion). |
| slow | `SUITE_SLEEP=120 bash run-sdd.sh slow` | counted. Extractor finished at collection. |
| fast | `SUITE_SLEEP=0 bash run-sdd.sh fast` | counted. Extractor finished at collection (not unfinished); the session wrote no `Decision extractor:` ledger line. |
| fast2 | `SUITE_SLEEP=0 PAD_LINES=10000 bash run-sdd.sh fast2` | counted. Padding doubled; extractor finished at collection again. |

An aborted `fast` launch (stopped by hand while the plan was still the first
revision) left no artifacts; its directory was removed before the relaunch.
