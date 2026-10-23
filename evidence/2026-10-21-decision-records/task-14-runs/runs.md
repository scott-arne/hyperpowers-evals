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
| stop | `SUITE_SLEEP=0 EXTRACTOR_DELAY=180 bash run-sdd.sh stop` | counted. Run with the SDD text's new ledger sentence (plugin HEAD 2db0cf0). Extractor stopped unfinished at collection (TaskStop, status stopped, records read `Nothing recorded.`). The delay hook did not fire (the extractor read the package with Bash `cat`, not Read); the stop was a race, the extractor having written its notes 2.4 s before the TaskStop. Turn 2 committed; no turn 3. |
| stop2 | `SUITE_SLEEP=0 EXTRACTOR_DELAY=180 bash run-sdd.sh stop2` | counted. Hook now `Read|Bash|Grep`, subagent payloads only, logging to hook.log. It fired for the task reviewer and the final reviewer (180 s each), not for the extractor, which read the package through a shell variable and glob. Extractor finished before collection; notes applied; turn 2 asked, turn 3 committed. |
| stop3 | `SUITE_SLEEP=0 EXTRACTOR_DELAY=240 bash run-sdd.sh stop3` | counted. Hook now matches `Write\|Edit\|MultiEdit\|Bash` on a subagent payload naming `decision-notes.md`. Fired once, for the extractor (240 s); TaskStop inside the window; no notes file at collection; records `Nothing recorded.`; turn 2 committed, no turn 3. |

An aborted `fast` launch (stopped by hand while the plan was still the first
revision) left no artifacts; its directory was removed before the relaunch.

`EXTRACTOR_DELAY` (default 0) is a `run-sdd.sh` parameter: above 0 the run's
`config/settings.json` also carries a PreToolUse hook on Read
(`extractor-delay-hook.sh`, beside the launcher) that sleeps that many seconds
before a Read of a review package (`review-<sha>..<sha>.diff`), and the value is
exported into the session's environment. Every run before `stop` ran before the
parameter existed, on plugin HEAD 3f9aca9 (the SDD text without the ledger
sentence); `stop` ran on HEAD 2db0cf0.

Hook revision before `stop2`: matcher `Read|Bash|Grep`; the hook acts only on a
payload carrying an `"agent_id"` key (a subagent's, so the controller's own
`cp` of the package is not delayed) whose text contains a
`review-<sha>..<sha>.diff` name; each delay appends `<UTC ts> delay <N>s
tool=<tool> agent=<id>` to `$EXTRACTOR_DELAY_LOG`, which run-sdd.sh sets to
`$SCRATCH/hook.log` and copies into the run directory as `hook.log` after turn 1.

Hook revision before `stop3`: the read-side matching is gone (the reviewers are
no longer delayed). The matcher is `Write|Edit|MultiEdit|Bash`; the hook acts on
a payload with an `"agent_id"` key (a subagent's) whose text names
`decision-notes.md`. Bash is in the matcher because the extractor writes its
notes with a Bash heredoc, never the Write tool (seen in `stop` and `stop2`).
