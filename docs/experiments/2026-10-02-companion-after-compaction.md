# 2026-10-02: the visual companion after a mid-brainstorm compaction, at the shipping head on `claude-opus-5-5`

**Hypothesis.** Pre-registered at `4d54418` before any counted session
launched.

The baseline (`2026-10-01-companion-baseline.md`) found the companion started
in 10 of 10 sessions of `brainstorming-bounded-fires-visual-companion`, so
that scenario does not reproduce the field failure. In the three field
brainstorms, an auto-compaction landed between the skill load and the first
visual question, and that question went to `AskUserQuestion`. A compaction
can lose the companion two ways: Claude Code re-attaches the skill cut at
20000 characters, which removes the pointer to `visual-companion.md`, and
the summary may drop the step. None of the four in-window field summaries
named the companion.

The question: when an auto-compaction lands between the skill load and the
first question of a field-shaped bounded brainstorm, does the shipping head
open the companion? A session counts as started when its post-check
`tool-arg-match Bash --matches 'command=start-server[.]sh'` passes. The count
is read against the best a fix could do, 10 of 10, by one-sided Fisher exact
p:
- 6 or fewer reproduces;
- 7 extends once to n=20;
- 8 or more does not reproduce.

If it reproduces, the default-window twin runs next under its own
pre-registration, then a candidate fix is measured with this arm as its
control. If not, no skill change follows.

**Config.**
- **Scenario.** `brainstorming-bounded-companion-after-compaction`: a
  feature-shaped brief (narrow down a 48-event activity table), a `NOTES.md`
  handoff note, four UI guideline documents of about 48k tokens that the
  fixture `CLAUDE.md` requires reading, and `.claude/settings.json` setting
  `autoCompactWindow` to 100000. The graded criteria are the baseline
  scenario's.
- **Arm.** Hyperpowers `external-workflow-adoption` at
  `5f4ab7889ce0cfc25dcca10ccf6187a180718248` (the baseline's `4fe932e` after
  the 2026-10-01 history rewrite), detached worktree
  `.worktrees/companion-baseline`, arm label `control`.
- **Harness.** This repository at `032de5a`.
- **Model and grader.** `claude-opus-5-5` through `claude-auto`, Claude Code
  2.1.287, default listing budget. The Gauntlet-Agent graded on
  `claude-opus-5-5`, set through `GAUNTLET_AGENT_MODEL` in the launch
  environment (the pre-registration's "Gauntlet's default" is corrected in
  the evidence README).
- **Batch.** 2 rows of `--repeat 5`, 10 sessions, 2 concurrent, 2026-10-02
  06:23:40Z to 07:15:59Z.
- **Clean run.** No grader voids, no setup voids, no version voids, no
  indeterminates, no extension.

**Run pointers.** `evidence/2026-10-02-companion-after-compaction/`,
containing:
- `README.md`, with the pre-registration, the pilots and the results;
- `manifest.tsv`;
- `launch-all.sh`, `logs/measure-launch.sh` and `archive-runs.sh`;
- `logs/`, with the row logs `p1` and `p2`, the pilot logs, `launch-all.out`
  and the window stamp;
- `tally.py` and `tally.txt`;
- `handread.md`;
- the 10 run archives under `runs/control/<run-id>/` and the 3 pilots under
  `runs/pilot/<run-id>/`.

**Verdict.** The scenario reproduces the failure. The shipping head started
the companion in 5 of 10 sessions (p = 0.016 against a perfect fix). The
composed final was 5 of 10, matching session for session, and `brainstorming`
was invoked through the Skill tool in 10 of 10.

The summary did not drop the step. An auto-compaction landed in the window in
all 10 sessions, and the last summary before the decision point named the
companion in all 10. Half still did not open it. The second loss the
hypothesis named was absent, so this campaign does not show that the
compaction causes the failure. The default-window twin tests that.

The two halves split cleanly on what they did after the first question,
which was always which filters to build:
- **Started (5).** Four named the placement of the controls as the next
  question or put it on screen directly. One sent the event-type control
  question to `AskUserQuestion` first, then opened the companion after the
  operator said they had no preference "on the look". All five read
  `visual-companion.md` before starting the server.
- **Not started (5).** Three never offered a layout choice: two asked
  nothing, one asked only non-visual questions, and each put the filters
  above the table in its in-chat design. Two sent the event-type control
  question to `AskUserQuestion` with no comparison in chat, then decided the
  placement themselves. None read `visual-companion.md`.

Two sessions announced a path ("bounded"); eight named none.

**Limits.**
- **Scope.** One model, one Claude Code version, one fixture.
- **Not the field shape.** In the field, the first question was the visual
  one and went to `AskUserQuestion`. Here the first question was always
  non-visual, and most failures never reached a layout choice.
- **No attribution.** Without the twin, the failure cannot be pinned on the
  compaction, the truncated re-attach, the brief, or the handoff note.
- **Host instruction files.** Since `74d2482` sessions do not load the host
  `CLAUDE.md` files. The field sessions loaded the human partner's global
  file, and so did the baseline's.
