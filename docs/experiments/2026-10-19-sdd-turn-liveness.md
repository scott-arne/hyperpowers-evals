# 2026-10-19: SDD turn liveness, the paired scenario campaign (negative)

**Hypothesis.** In Zed SDD sessions the controller dispatches its subagents in
the background, ends its turn while they work, and the human partner, seeing
an idle session, types "Resume". Over the field baseline window that is 301
premature stops against 1495 task boundaries, 20.13 per 100
(`evidence/2026-10-19-sdd-turn-liveness/field/baseline.json`). The
`subagent-driven-development` skill text was changed to say the turn stays
open: five dispatch templates carry `run_in_background: false`, SKILL.md
states the foreground and watch rules, and two entries join the
rationalization list. The pre-registered claim is that the change raises the
foreground dispatch share, removes live-work turn ends, makes the controller
run a four-minute covering command in the foreground and watch a
twelve-minute one to its end, removes premature stops, and does not lower run
success. The decision rule (W1, W2, F, U, P, R with their thresholds) and
every measure definition were written into
`evidence/2026-10-19-sdd-turn-liveness/README.md` before the first counted
run, at evals `8fc5d0c93`.

**Config.** Paired campaign, ten valid runs per arm, control first. Treatment
is hyperpowers `c353fc7b3856e6cd69c05caf9a735606d26ede38`, control
`f1fd935cbf79898430e4aac740b547c40d9c1103` (tag v6.16.1), each a detached
worktree never edited. Scenario `sdd-turn-liveness` with an elicited
six-task fixture plan; Coding-Agent `claude-auto` on Vertex pinned to
`claude-opus-5-5` through `ANTHROPIC_MODEL`, subagents allowed
`claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-4-5-20251001`; Claude
Code 2.1.302 at a fixed path; Codex absent, affirmatively checked; the task
tools on and Claude Code's fork mode off through the scenario's
`# claude-env:` directive (plan deviation 9). Harness pin evals
`dfa45712d9ad17b2688bc8881bba2017c5b923a1`, with later evidence commits
accepted while the harness path set is unchanged. The full pin is
`evidence/2026-10-19-sdd-turn-liveness/manifest.tsv`, re-checked by
`logs/measure-launch.sh` before every launch. Control ran 2026-10-22 03:34Z
to 06:49Z, treatment 17:53Z to 19:42Z, both detached at concurrency 5 and
outside the host's command sandbox, which quorum's `git init` cannot run in.

**Run pointers.** `evidence/2026-10-19-sdd-turn-liveness/`: the
pre-registration and the full result table in `README.md`, the analyzer
output in `tally.txt`, the hand labels in `adjudications.tsv`, the per-row
launch logs in `logs/`, the sixteen control runs in `task-11-runs/control/`
and the ten treatment runs in `task-12-runs/treatment/`, each beside its
`workspaces/` copy. The analyzers are `liveness.py`, `analyze.py` and
`tally.py` in the same directory, pinned by blob in `README.md` with four
recorded Corrections.

**Verdict.** **FAIL**, on F and P; W1, W2, U and R pass.

| Measure | Threshold | Treatment | Verdict |
|---|---|---|---|
| W1 foreground dispatch share | ≥ 0.9 | 1.0 (132 of 132) | PASS |
| W2 live-work turn ends | ≤ 1 | 0 | PASS |
| F runs with both slow-command measures | ≥ 9 of 10 | 8 | FAIL |
| U untracked launches | 0 | 0 | PASS |
| P premature stops | < control's 1, and ≥ 9 runs with none | 1, 9 runs with none | FAIL |
| R successful runs | ≥ 7 and ≥ control's 8 − 1 | 8 | PASS |

Control, for contrast: foreground share 0.75 (99 of 132), 71 live-work turn
ends, 1 premature stop, 8 successful runs, both slow-command measures in 0 of
10 runs. The behavioral separation the change was written for is large and
one-sided — every treatment dispatch ran in the foreground and no treatment
turn ended with work live, against 33 background dispatches and 71 live-work
turn ends in control — and the campaign still fails its own rule, because F
needs nine of ten and P needs a strictly lower premature total than a control
base of one.

**Limits.** Both F misses are one shape. p8 (`…184730Z-c05c`) and p10
(`…184831Z-16ed`) each launched the twelve-minute test as a tracked
background job and watched it in a foreground call that printed `exit=0` more
than 600 s later, p8 through a shell variable (`"$W/soak-long.out.exit"`) and
p10 through a relative path after a `cd`. The pinned analyzer pairs a watch
to its job by finding the launch's output path as a literal substring of the
watch command, so neither matched and both read `watched=false`. No
Correction was made: the shape was found while reading the treatment arm's
own results, and changing the instrument there would be a post-hoc change to
what the decision rests on. The same two runs are treatment's only
unsuccessful ones and the source of its single premature stop: p8 wrote its
last ledger mark as `Task 6: soak_long OK (…) ; complete (…)` instead of
`Task 6: complete`, so its closing report after the merge read as a mid-plan
turn end; p10 wrote five of six marks with a relative redirect after a `cd`,
which the analyzer cannot resolve statically.

P rests on one control event in ten runs, which cannot separate the arms
either way. The control arm also lost five rows to a host name-resolution
failure at about 04:39Z; those are `void-transport`, outside the cap by plan
deviation 10, and were relaunched. The scenario is short and fresh while the
field's premature stops come from long, compacted sessions, so this campaign
was never the whole case; the field decision rule in the spec is where P's
question gets power. Both arms ran without Claude Code's fork mode: under
fork mode the Agent tool has no `run_in_background` parameter and every
dispatch is backgrounded in both arms, so the contrast measured here does not
exist inside an ordinary interactive terminal session.
