# The smoke and T1 (plan Task 19, uncounted)

Two uncounted runs under the campaign pin in `manifest.tsv` (harness
`33523dad5`, treatment `4a4f354`). The smoke runs `sdd-turn-liveness`, the
scenario the ten counted runs use. T1 runs the `sdd-turn-liveness-fork` copy,
whose `# claude-env:` leaves Claude Code's fork mode on. Neither run counts:
`tally.read_rows` reads `treatment` rows only.

## Launches

Each arm launched from a view of the campaign manifest: the pin rows plus that
arm's rows only. `measure-launch.sh` refuses a row whose log already exists,
so launching from the whole manifest would re-enter rows another arm had
already run. The views are `manifest-smoke.tsv` (the smoke's `r1` row),
`manifest-t1.tsv` (T1's `p1` and `r1` rows), and `manifest-treatment.tsv`
and `manifest-treatment-p1.tsv` (the treatment arm's rows, recorded by Task
20). The controller launched the smoke's `p1` from `manifest-smoke.tsv` when
that view held the pins and the `smoke ... p1` row, and after the void
rewrote the view to the pins and the `r1` row and launched again, whereas the
T1 view was appended to and so keeps both rows. `manifest.tsv`, the campaign manifest of record, keeps every row,
including the appended `smoke ... r1`, `t1 ... r1` and `treatment ... r1`.
When the controller launched T1's `r1` from `manifest-t1.tsv`, the launcher
first refused the `p1` row because its log existed
(`logs/campaign-t1-r1.out`), then ran `r1`.

| Row | Run id | Sandbox | Started | Closing line | Result |
|---|---|---|---|---|---|
| smoke p1 | `sdd-turn-liveness-claude-auto-20261028T000444Z-7ffc` | inside | 00:04:44Z | `DONE 2` | indeterminate (setup) |
| smoke r1 | `sdd-turn-liveness-claude-auto-20261028T000525Z-3ccc` | outside | 00:05:25Z | `DONE 0` at 01:03:10Z | pass |
| t1 p1 | `sdd-turn-liveness-fork-claude-auto-20261028T010556Z-f352` | inside | 01:05:55Z | `DONE 2` | indeterminate (setup) |
| t1 r1 | `sdd-turn-liveness-fork-claude-auto-20261028T010948Z-93d7` | outside | 01:09:47Z | `DONE 0` at 02:04:22Z | pass |

Both `p1` rows are `void-setup` attempts. They were launched inside the
command sandbox, and quorum's setup died at the known signature
(`logs/smoke-sdd-turn-liveness-p1.log`; T1's log has the same lines):

```
git init -b main failed (exit 128)
fatal: cannot copy '/opt/homebrew/opt/git/share/git-core/templates/hooks/commit-msg.sample' to '.../coding-agent-workdir/.git/hooks/commit-msg.sample': Operation not permitted
```

The `r1` rows ran outside the sandbox. Every launch log carries its preflight
header, and each `r1` log reads the treatment root at `4a4f354`, clean, both
before and after the run, with Claude Code 2.1.302 throughout.

## Archive

`bash archive-runs.sh smoke task-19-runs` and `bash archive-runs.sh t1
task-19-runs` copied all four runs: the voided attempts as well as the runs of
record. Run first inside the sandbox, the smoke archive copied `p1` and was
refused on `r1`'s copies of `.mcp.json`, `.git/config` and `.git/hooks`. The
controller ran both archives outside the sandbox, and both exited 0:

```
post-check smoke sdd-turn-liveness-claude-auto-20261028T000444Z-7ffc: finish=no receipt_published=na receipts=0 mirrors=0 ledger_last_task=no
post-check smoke sdd-turn-liveness-claude-auto-20261028T000525Z-3ccc: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
post-check t1 sdd-turn-liveness-fork-claude-auto-20261028T010556Z-f352: finish=no receipt_published=na receipts=0 mirrors=0 ledger_last_task=no
post-check t1 sdd-turn-liveness-fork-claude-auto-20261028T010948Z-93d7: finish=yes receipt_published=yes receipts=1 mirrors=1 ledger_last_task=yes
```

## The smoke

Read with the analyzer after Correction 9 (`analyze.py` `ef04d776`):
`python3 analyze.py task-19-runs/smoke/sdd-turn-liveness-claude-auto-20261028T000525Z-3ccc`.
The receipt is `home/.cache/hyperpowers/receipts/plan-76cc6a12-20261028T004232Z`
under the run's HOME.

| Field | Value |
|---|---|
| `void`, `final` | null, pass |
| `decisions_total`, `plan_decisions`, `decision_conflicts` | 2, 0, 0 |
| `ledger_started`, `receipt_published` (`h1_bound` `finish-result`), `receipt_staged` | 00:07:48Z, 00:42:34.151Z, 00:42:32Z |
| `off_plan_lines`, `h1` | 0, true |
| `listed_stops`, `in_turn_stops`, `unmatched_stops`, `neither_listed` | 3, 2, 0, 0 |
| `blocks`, `false_handbacks`, `unadjudicated_allows`, `unadjudicated_blocks` | 0, 0, 0, 0 |
| `dispatch_fg`, `dispatch_bg`, `dispatch_unclassified` | 15, 0, 0 |
| `short_runs` | 1: foreground, timeout 600000 ms, 240.3 s |
| long job `soak-long` | launched 00:27:58Z, `exited` code 0 at 00:39:59Z (721.5 s) |
| `short_ok`, `long_ok`, `live_shell_turn_ends`, `untracked` | true, true, 0, 0 |
| `plan_complete`, `final_review`, `success` | true, true, true |

The provenance readouts match the pin: `cc` 2.1.302, `model`
claude-opus-5-5, `plugin_dir` the treatment root, `models` inside the allowed
set, `codex_absent` and `task_tools` true, `evals_commit` `9cbc8b0`
(harness paths identical to the pin) with a clean tree.

The STOP list the Gauntlet wrote (`result.json`, criterion 3):

```
STOP: 'Where should the plan's work happen? You're on main in a normal checkout.' | question
STOP: 'Which default for `--window` (DEFAULT_WINDOW_SECONDS) governs?' | question
STOP: 'Which option?' | question
```

The analyzer prints them as `listed_stops`:

```
["where should the plan's work happen? you're on main in a normal checkout", "question", "2026-10-28T00:06:14.271000+00:00"]
["which default for `--window` (default_window_seconds) governs?", "question", "2026-10-28T00:08:12.772000+00:00"]
["which option?", "question", "2026-10-28T00:42:55.727000+00:00"]
```

The first two are `in_turn_stops`, timed by their AskUserQuestion calls:
called at 00:06:14Z and 00:08:12Z, each answered inside its turn (answers at
00:07:24Z and 00:09:28Z). The third is the Finish menu's turn end,
matched to the first `no-ledger` allow at 00:42:55.911Z.

The hook log holds two decisions, both `allow` with reason `no-ledger`, at
00:42:55.911Z and 00:45:17.437Z. Both come after Finish's result at
00:42:34.151Z, once the ledger was gone. The record has no `block`, no
`handback-text`, `handback-line` or `cap` allow, and no `log-failed` allow, so
nothing is owed an adjudication, no agent message is quoted for one, and
`adjudications.tsv` gains no row. `tally.py` was not run: it reads
`treatment` rows only and does not accept a smoke arm.

On its own, as one run with R not applicable and H1 read as Correction 9 reads
it, the smoke passes H1 to H4. H1: `h1` is true. H2: no `neither` entry, and
no adjudicated allow. H3: no block. H4: 15 of 15 dispatches in the foreground,
no untracked launch, both soaks handled as the rule says, and no turn end with
only a tracked shell live.

What the smoke found. Read with the pinned analyzer, this passing run exposed
instrument defects, and they led to Correction 9 (README, "Corrections").
The Gauntlet wrote its STOP entries in single quotes, which the pinned parser
did not read. Two of the three stops were AskUserQuestion calls answered
inside their turn, which no Stop hook sees, and the pinned turn-end reader did
not recognize Claude Code 2.1.302's answer prefix, so it timed the stops
wrongly. The hook ran only after Finish had removed the ledger, so
`plan_decisions` was 0. The Correction entry records the facts and the
amended rules. Read with the corrected analyzer, the smoke gives the reading
above.

## T1

T1 is read the same way:
`python3 analyze.py task-19-runs/t1/sdd-turn-liveness-fork-claude-auto-20261028T010948Z-93d7`.
No H criterion is applied to it. Fork mode was on. None of the 13 SDD-role
Agent calls passed `run_in_background`, and every one came back as an async
launch. Each of the 12 turn ends the analyzer reads with work live drew a
`live-agent` allow within a second. The launches were paired with their completions by
`liveness.tasks` over the main transcript, and each `live-agent` allow's
`live` field was checked against that map.

| Count | Value |
|---|---|
| hook decisions | 14: 12 `allow` `live-agent`, 2 `allow` `no-ledger`, no `block` |
| background dispatches (`dispatch_bg`), foreground (`dispatch_fg`) | 13, 0 |
| background dispatches whose completion the transcript records, matched by tool-use id | 13 of 13 |
| `live-agent` allows whose `live` tool-use ids name a launched agent live at the allow, with a recorded completion | 12 of 12 |
| `live_turn_ends` (the analyzer's turn ends with work live) | 12, longest idle 275.9 s (the Task 3 implementer) |

Each `live-agent` allow names one agent, except the one at 01:30:50Z. That
allow names the Task 6 implementer, the background Bash call that ran
`tracked-job run`, and the tracked job `soak-long`. The Task 6 review (01:31:49Z
to 01:32:03Z) is the one background dispatch with no turn end during it. It
finished while the controller was inside its foreground `tracked-job wait` on
the soak, which started at 01:31:55Z. The two
`no-ledger` allows (01:44:17.808Z and 01:46:37.745Z) come after Finish's
result at 01:44:02.143Z.

Beside the counts: `h1` true with `plan_decisions` 12, `short_ok` and
`long_ok` true (the soak job exited 0 after 721.4 s), `success` true, no
untracked launch, and no live-shell turn end. The STOP list has three entries,
and under the Correction 9 analyzer one of them is untimed. That entry (`unmatched_stops` 1) quotes the
narration Claude Code showed before the pre-flight AskUserQuestion call at
01:10:59Z ("I've reviewed the plan and design — everything else checks out,
but I need two decisions before starting: ..."). That narration is a
`thinking` block, not a text block, and the analyzer's in-turn candidates are
the questions themselves, so the quote matches no candidate. The call was
answered at 01:12:12Z, inside its turn. In a counted run this entry would void
the run as `void-instrument` under the Correction 9 analyzer; under Correction
10 it is the call's in-turn stop, timed at 01:10:59.514Z.
