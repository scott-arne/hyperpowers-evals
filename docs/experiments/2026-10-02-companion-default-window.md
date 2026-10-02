# 2026-10-02: the visual companion at the default compaction window, at the shipping head on `claude-opus-5-5`

**Hypothesis.** Pre-registered at `77a570a` before any counted session
launched.

Stage 1 (`2026-10-02-companion-after-compaction.md`) started the companion
in 5 of 10 sessions of `brainstorming-bounded-companion-after-compaction`,
so that scenario reproduces the field failure. Every session compacted
before the decision point, and every last summary named the companion. So
the summary dropping the step is not needed, but stage 1 cannot say whether
the compaction contributes at all. Each compaction re-attached the
brainstorming skill cut at 20000 characters, which loses the per-question
test, its examples, and the pointer to `visual-companion.md`.

The question: with the same brief, handoff note and required reading at
Claude Code's default compaction window, how often does the shipping head
start the companion? A session counts as started when its post-check
`tool-arg-match Bash --matches 'command=start-server[.]sh'` passes. The count
is read against stage 1's 5 of 10 and against a perfect fix, 10 of 10, by
one-sided Fisher exact p:
- 6 or fewer: the failure reproduces without the compaction;
- 7, 8 or 9: extends once to n=20;
- 10: the compaction contributes.

Either way, the fix is written under `hyperpowers:writing-skills` and
measured on the compaction scenario, with stage 1 as its control. If the
failure reproduces, the fix targets the trigger, and bringing `SKILL.md`
under the re-attach cap is not pursued as the fix on its own.

**Config.**
- **Scenario.** `brainstorming-bounded-companion-default-window`. Its
  `setup.sh` runs stage 1's with `COMPANION_NO_WINDOW=1`, so the brief, the
  handoff note, the fixture `CLAUDE.md` and the four guideline documents are
  shared and cannot drift. The one difference: no `.claude/settings.json` is
  written, so the default window applies instead of `autoCompactWindow`
  100000. The story and the graded criteria are stage 1's.
- **Arm.** Hyperpowers `external-workflow-adoption` at
  `5f4ab7889ce0cfc25dcca10ccf6187a180718248`, detached worktree
  `.worktrees/companion-baseline`, arm label `control`. Stage 1's arm and
  tree; stage 1 is not re-run.
- **Harness.** This repository at `032de5a`.
- **Model and grader.** `claude-opus-5-5` through `claude-auto`, Claude Code
  2.1.287, default listing budget. The Gauntlet-Agent graded on
  `claude-opus-5-5`, set through `GAUNTLET_AGENT_MODEL` in the launch
  environment and recorded in each row log.
- **Batch.** 2 rows of `--repeat 5`, 10 sessions, 2 concurrent, 2026-10-02
  08:54:59Z to 09:41:31Z.
- **Clean run.** No grader voids, no setup voids, no version voids, no
  indeterminates, no extension.

**Run pointers.** `evidence/2026-10-02-companion-default-window/`,
containing:
- `README.md`, with the pre-registration and the results;
- `manifest.tsv`;
- `launch-all.sh`, `logs/measure-launch.sh` and `archive-runs.sh`;
- `logs/`, with the row logs `p1` and `p2`, `launch-all.out` and the window
  stamp;
- `tally.py` and `tally.txt`;
- `handread.md`;
- the 10 run archives under `runs/control/<run-id>/`.

**Verdict.** The failure reproduces without the compaction. The shipping
head started the companion in 4 of 10 sessions, and no session compacted.
That is not more often than stage 1's 5 of 10 (p = 0.815), and a perfect fix
would separate from it (p = 0.005). The composed final was 4 of 10, matching
session for session, and `brainstorming` was invoked through the Skill tool
in 10 of 10. A smaller contribution from the compaction is not ruled out.

The failures look the same in both campaigns. In all 11 (five in stage 1,
six here), the in-chat design placed the filters above the table without
offering the placement as a choice.
- **Started (4).** Each read `visual-companion.md`, then opened the companion
  on three candidate layouts. One sent the event-type control question to
  `AskUserQuestion` first, after a comparison in chat, then opened the
  companion on layouts that "differ only in placement".
- **Not started (6).** Each sent a control question to `AskUserQuestion`
  with no comparison in chat: four which control picks event types, two only
  which control picks the week. None read `visual-companion.md`. One wrote
  that the layout "is simple enough to describe in text, so I'm not opening
  a browser mockup", the only visible decline in either campaign.

Nine sessions announced the bounded path; one named none. In stage 1, two
of ten announced a path. The class mix differs from stage 1, where three
failures never asked a control question. The campaign was not sized to
compare them.

**Limits.**
- **Scope.** One model, one Claude Code version, one fixture.
- **Not a full null on the compaction.** The design separates "the failure
  needs the compaction" from "it does not". It does not measure a smaller
  contribution.
- **Thinking not recorded.** The transcripts carry no thinking text, so
  whether the five other failures weighed the companion is not visible.
- **Host `/tmp`.** Nine sessions checked the page in headless Chrome after
  approval and wrote scripts, screenshots and profiles to the literal host
  `/tmp`, outside the run directory. Four reused `/tmp/actcheck`, which a
  stage 1 session created. None of it is archived. Every first use came
  after the approval or the companion start, so the count is unaffected.
- **Host instruction files.** Since `74d2482` sessions do not load the host
  `CLAUDE.md` files. The field sessions loaded the human partner's global
  file.
