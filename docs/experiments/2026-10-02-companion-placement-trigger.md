# 2026-10-02: the visual companion placement trigger, against stage 1 on `claude-opus-5-5`

**Hypothesis.** Pre-registered at `73d815a` before any counted session
launched.

Stage 1 (`2026-10-02-companion-after-compaction.md`) started the companion
in 5 of 10 sessions of `brainstorming-bounded-companion-after-compaction`.
The default-window twin (`2026-10-02-companion-default-window.md`) started
it in 4 of 10 with no compaction, so the failure lives in the trigger. In
all 11 failures across the two campaigns, the design placed the filters
without offering the placement as a choice. The skill's trigger keys on a
question being posed, and the failing sessions never posed this one.

The change, hyperpowers `db33b7e` on branch `companion-placement-trigger`
(off `5f4ab78`), adds two sentences to the any-path visual companion
paragraph of `skills/brainstorming/SKILL.md`: "Adding or moving something on
a page or screen always raises one: where it goes. Show the placements in
the companion before you present the design." That is 149 characters, at
character 8791 of 23362. The never-open and asks-to-stop rules still end
inside the 20000-character re-attach. A two-place draft (+296, also in the
bounded checklist) pushed them past the cut and was dropped.

A session counts as started when its post-check
`tool-arg-match Bash --matches 'command=start-server[.]sh'` passes, read
against stage 1's 5 of 10 by one-sided Fisher exact p:
- 6 or fewer of 10: the fix fails;
- 7, 8 or 9: extends once to n=20;
- 10: separates (p 0.016).

The composed final is a guard through the same table. If more than a fifth
of sessions miss the compaction window, no reading is taken.

**Config.**
- **Scenario.** `brainstorming-bounded-companion-after-compaction`, stage
  1's scenario and fixture, unchanged.
- **Arm.** Hyperpowers `db33b7e131462681a9d2fa5b74ad68163e434ace`, worktree
  `.worktrees/companion-placement-trigger`, arm label `treatment`. The
  control is stage 1's committed 5 of 10 at `5f4ab78`, not re-run.
- **Harness.** This repository at `032de5a`.
- **Model and grader.** `claude-opus-5-5` through `claude-auto`, Claude Code
  2.1.287, default listing budget. The Gauntlet-Agent graded on
  `claude-opus-5-5`, set through `GAUNTLET_AGENT_MODEL` and recorded in each
  row log.
- **Batch.** 2 rows of `--repeat 5`, 10 sessions, 2 concurrent, 2026-10-02
  13:29:47Z to 14:23:59Z.
- **Clean run.** No grader voids, no setup voids, no version voids, no
  indeterminates, no extension.

**Run pointers.** `evidence/2026-10-02-companion-placement-trigger/`,
containing:
- `README.md`, with the pre-registration and the results;
- `manifest.tsv`;
- `launch-all.sh`, `logs/measure-launch.sh` and `archive-runs.sh`;
- `logs/`, with the row logs `p1` and `p2`, `launch-all.out` and the window
  stamp;
- `tally.py` and `tally.txt`;
- `handread.md`;
- the 10 run archives under `runs/treatment/<run-id>/`.

**Verdict.** The fix holds. Every session started the companion, 10 of 10
against stage 1's 5 of 10 (p = 0.016). The composed final was 10 of 10 as
well (p = 0.016). `brainstorming` was invoked through the Skill tool in 10
of 10, and a compaction landed in the window in 10 of 10.
- **First screens.** Every one asked where the filters go, as three or four
  wireframed placements. Eight showed placements only. Two also offered one
  placement again with a shortcut control added.
- **Order.** Nine of ten made the placement their first question. The tenth
  first asked what to filter by, then opened the companion on placements.
- **Permission.** No session asked permission to open the companion.
- **Path.** Nine announced the bounded path and one named none. In stage 1,
  two of ten announced a path.

**Limits.**
- **Scope.** One scenario, one model, one Claude Code version, one fixture.
- **Over-triggering is not measured.** No session ran a change that puts
  nothing on a page, so whether the sentence opens the companion where it
  should not, for example on a command-line tool's output, is untested.
- **Historical control.** Stage 1 ran about six hours earlier on the same
  pins. Drift in the served model between the two is not controlled.
- **Default window not re-measured.** Whether the fix also lifts the twin's
  4 of 10 is not tested.
- **The never-open and asks-to-stop rules are not exercised.** They survive
  the re-attach cut, but no session was asked to stop, and this change
  always puts something on a page.
- **Host `/tmp`.** Two sessions checked the built page in headless Chrome
  under the literal host `/tmp`, after their companion start. Those files
  are not archived. The count is unaffected.
