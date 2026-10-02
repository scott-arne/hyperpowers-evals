# 2026-10-02: the visual companion placement trigger on a command-line change, on `claude-opus-5-5`

**Hypothesis.** Pre-registered at `a849422` before any session launched,
pilot included.

The placement-trigger campaign (`2026-10-02-companion-placement-trigger.md`)
measured hyperpowers `db33b7e`, which adds to the any-path visual companion
paragraph of `skills/brainstorming/SKILL.md`: "Adding or moving something on
a page or screen always raises one: where it goes. Show the placements in
the companion before you present the design." It started the companion in
10 of 10 sessions on a page change and left over-triggering unmeasured. A
reader could take "screen" to cover a terminal, though the companion's
per-question test sends text content to the terminal.

On a bounded change that adds something to a command-line tool's terminal
output and puts nothing on a page, a session counts as started when its
post-check `not check-transcript tool-arg-match Bash --matches 'command=start-server[.]sh'`
fails:
- 0 of 10: holds, the companion stayed closed;
- 1 of 10: extends once to n=20, where 0 or 1 holds;
- 2 or more: fails.

If more than a fifth of sessions lack the `brainstorming` skill-called
record, no reading is taken.

**Config.**
- **Scenario.** `brainstorming-bounded-companion-closed-cli-output`, new. A
  small Node command-line tool, `svc`, whose `status` table hides
  health-check results already present in its snapshot. The brief asks to
  show which services are failing. The operator gives no cue either way
  about how to show options.
- **Arms.** Treatment, hyperpowers
  `db33b7e131462681a9d2fa5b74ad68163e434ace` (worktree
  `.worktrees/companion-placement-trigger`), counted. Control, hyperpowers
  `5f4ab7889ce0cfc25dcca10ccf6187a180718248` (worktree
  `.worktrees/companion-baseline`), one uncounted pilot session to check the
  instrument. The reading is absolute.
- **Harness.** This repository at `7584a67`, the commit that adds the
  scenario.
- **Model and grader.** `claude-opus-5-5` through `claude-auto`, Claude Code
  2.1.287, default listing budget. The Gauntlet-Agent graded on
  `claude-opus-5-5`, set through `GAUNTLET_AGENT_MODEL` and recorded in each
  row log.
- **Pilot.** 1 session at the control, 2026-10-02 19:07:08Z to 19:10:02Z.
- **Batch.** 2 rows of `--repeat 5`, 10 sessions, 2 concurrent, 2026-10-02
  19:10:45Z to 19:28:42Z.
- **Clean run.** No grader voids, no setup voids, no version voids, no
  indeterminates, no extension.

**Run pointers.** `evidence/2026-10-02-companion-over-trigger/`,
containing:
- `README.md`, with the pre-registration and the results;
- `manifest.tsv` and `manifest-pilot.tsv`;
- `launch-all.sh`, `logs/measure-launch.sh` and `archive-runs.sh`;
- `logs/`, with the row logs `p0`, `p1` and `p2`, both `launch-all` outputs,
  the two window stamps and `mutation-checks.txt`;
- `tally.py` and `tally.txt`;
- `handread.md`;
- the run archives under `runs/control/<run-id>/` (the pilot) and
  `runs/treatment/<run-id>/` (10).

**Verdict.** Holds: the companion stayed closed. No counted session started
it, 0 of 10, which excludes start rates above 26% (one-sided 95%). The
composed final was 10 of 10 and `brainstorming` was invoked through the
Skill tool in 10 of 10. The pilot passed its instrument check and did not
start the companion.
- **How the choice was posed.** Nine sessions asked it through
  `AskUserQuestion`, seven after drawing text samples in chat. One drew
  samples in chat and asked in prose.
- **Browser.** No session offered the companion or a browser. Seven said
  they were not opening it because the output is terminal text. None read
  `visual-companion.md` or wrote an `.html` file.
- **Path.** Eight announced the bounded path and two named none.
- **Framing, not pre-registered.** Five sessions put the question as where
  the health information goes, the treatment's wording, and kept it in the
  terminal anyway. With one control session, cause is not shown.

**Limits.**
- **One shape of change with no page.** A terminal table. Back-end,
  configuration and API changes are not tested.
- **No compaction.** A compacted session re-attaches `SKILL.md` cut at 20000
  characters, which keeps the new sentence and drops the per-question test.
  A compacted session may open the companion where these did not.
- **Power.** A start rate near 10% would still hold half the time (0.48),
  so it is not ruled out.
- **No counted control.** One pilot session at `5f4ab78`.
- **The operator's yes was never tested.** No session asked permission to
  open the companion.
- **Scope.** One scenario, one model, one Claude Code version, one fixture.
