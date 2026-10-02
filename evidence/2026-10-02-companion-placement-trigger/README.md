# Visual Companion Placement Trigger After Compaction (2026-10-02)

Pre-registered before the first counted session. The rules below were fixed
and committed before any counted run launched; results are appended under
Results.

## Question

Two campaigns at the shipping head measured how often brainstorming starts
the visual companion for a feature whose layout question arises inside it:
- **Stage 1** (`../2026-10-02-companion-after-compaction/`, results at
  734790a) ran `brainstorming-bounded-companion-after-compaction`. The
  companion started in 5 of 10 sessions, and every session compacted before
  the decision point.
- **The twin** (`../2026-10-02-companion-default-window/`, results at
  ab03a20) ran the same fixture at Claude Code's default window. The
  companion started in 4 of 10, and no session compacted. The failure
  reproduces without the compaction.

The failures look the same in both. In all 11 (five in stage 1, six in the
twin), the in-chat design placed the filters above the table without
offering the placement as a choice, and none read `visual-companion.md`.
The started sessions made the layout its own question: in the twin all four
opened with three candidate layouts, and in stage 1 four of the five named
the placement as the next question or put it on screen directly.

The shipping head keys the companion on a question: "the first time a
question would genuinely be clearer shown than described". The failing
sessions never posed the placement as a question, so nothing fired. One
twin session weighed the companion and declined it, two dropdowns above the
table being "simple enough to describe in text, so I'm not opening a browser
mockup".

The treatment keys the trigger on what the change does instead: if it adds
or moves something on a page or screen, where it goes is the visual
question, and the placements go in the companion before the design. The question: on the compaction scenario, where the shipping head
started the companion in 5 of 10 sessions, how often does the treatment
start it?

## Change

Hyperpowers branch `companion-placement-trigger`, one commit
db33b7e on 5f4ab78, changing only `skills/brainstorming/SKILL.md`.
It adds two sentences to the any-path visual companion paragraph, after
"whichever path you are on.", and removes nothing:

> Adding or moving something on a page or screen always raises one: where
> it goes. Show the placements in the companion before you present the
> design.

It was written under `hyperpowers:writing-skills`. The failure is behavior
that should depend on a condition, so the form is a conditional keyed to an
observable predicate, with no exemption clause ("Match the Form to the
Failure"). The rest of the companion's rules are unchanged: it opens with no
separate approval gate, and it closes when the human partner asks.

**Why the any-path paragraph.** None of the 20 sessions in stage 1 and the
twin made a single task-tool call, so no session worked the checklist as
tasks. In stage 1, 8 of 10 sessions announced no path. The any-path
paragraph applies whichever path a session takes. A first draft also put the
predicate in the bounded checklist's step 2 (+296 characters in all). That
pushed "If a visual question never arises, never open it. If the user asks to
stop using it, ..." past the re-attach cut below, so the draft was cut to
this one place.

**Size and the re-attach cut.** `SKILL.md` grows from 23213 to 23362
characters (+149; 23496 bytes). After a compaction, Claude Code re-attaches
the skill cut at 20000 characters:
- **At 5f4ab78** the cut falls inside the per-question decision's test
  sentence ("would the user understand this bet").
- **In the treatment** the insertion starts at character 8791, before the
  cut. The cut moves 149 characters earlier and falls right after the label
  "**Per-question decision". The never-open and asks-to-stop rules end at
  character 19975 and survive. The re-attached treatment loses the
  per-question decision, which the control keeps up to the middle of its
  test sentence.

The treatment's own text survives the cut. The extra loss works against the
treatment. Bringing `SKILL.md` under the cap is not part of this change.

## Scenario

`brainstorming-bounded-companion-after-compaction` at the harness pin,
unchanged: stage 1's scenario, with its feature-shaped brief, the handoff
note, about 48k tokens of required reading, and `autoCompactWindow` 100000.
The story and the graded criteria are stage 1's.

The twin is not run. A default-window run of the treatment is not part of
this pre-registration.

## Arms

- **treatment:** hyperpowers `companion-placement-trigger` at
  db33b7e, worktree `.worktrees/companion-placement-trigger`. It is
  5f4ab78 plus the change above.
- **control:** stage 1's committed counts at 5f4ab78 (its `tally.txt` at
  734790a): started 5 of 10 and a composed final of 5 of 10. It is not
  re-run. The scenario, harness pin, model, grader, Claude Code version and
  budget are the same.

## Pins

In `manifest.tsv`:
- harness 032de5a, stage 1's harness pin (evidence commits may follow it;
  harness paths may not);
- treatment db33b7e;
- model `claude-opus-5-5` via `claude-auto`.

**Grader:** the Gauntlet-Agent on `claude-opus-5-5`, as in stage 1 and the
twin. `logs/measure-launch.sh` refuses to launch unless
`GAUNTLET_AGENT_MODEL` is `claude-opus-5-5`, and records it in each row log.
Each archived `result.json` records the grader model.

**Budget** `default`: `SLASH_COMMAND_TOOL_CHAR_BUDGET` and
`INTERLOCK_PROBE_TRACE` unset. `ANTHROPIC_DEFAULT_OPUS_MODEL` is unset; each
row log records it.

**Claude Code 2.1.287**, pinned as in stage 1:
- `logs/measure-launch.sh` refuses to launch unless `claude --version` is
  2.1.287, and logs the version before and after each row;
- `tally.py` voids any session whose transcript records a version other than
  2.1.287 alone (see Void Attempts).

**Host instruction files.** As in stage 1, sessions do not load the host
`CLAUDE.md` files above the run directory (since evals 74d2482).

Checked before this file was committed:
- `claude --version` prints 2.1.287;
- `.worktrees/companion-placement-trigger` is at db33b7e with a
  clean tree;
- the evals harness paths are clean and identical to the harness pin;
- `GAUNTLET_AGENT_MODEL` is `claude-opus-5-5` in the launch shell.

`logs/measure-launch.sh` repeats all four on every row.

There is no pilot. The scenario and the harness are stage 1's, and only the
skill differs. A setup failure is a void attempt (see Void Attempts).

## Size

2 manifest rows, each one `quorum run --repeat 5` process: 10 sessions, 2
concurrent.

## Decision Rules

**Primary measure.** As in stage 1, a session counts as started when its
deterministic post-check `tool-arg-match Bash --matches 'command=start-server[.]sh'`
passes.

**The reference.** Stage 1, 5 of 10. Each count is read by a one-sided
Fisher exact test of stage 1 starting the companion less often than the
treatment. At n=10, p is 0.500 at 6, 0.325 at 7, 0.175 at 8, 0.070 at 9 and
0.016 at 10. At n=20 (stage 1 stays at 5 of 10), p is 0.169 at 15, 0.104 at
16, 0.056 at 17, 0.026 at 18, 0.009 at 19 and 0.002 at 20.

| Treatment, started | Reading |
|---|---|
| 6 or fewer of 10 | does not separate: the fix fails |
| 7, 8 or 9 of 10 | extended once to n=20 |
| 10 of 10 | separates (p 0.016) |
| 15 or fewer of 20 | does not separate: the fix fails |
| 16 or 17 of 20 | not separated: the human partner's call |
| 18 or more of 20 | separates (p <= 0.026) |

**Guard: the composed final.** The graded criteria include opening the
companion just-in-time rather than upfront, keeping the task bounded, and
asking for approval before code. In stage 1 the composed final was 5 of 10,
matching the started count session for session. When the started count
separates, the composed final count goes through the same table against
stage 1's 5 of 10. The fix holds only when it separates too. Otherwise the
reading is "the started count separates and the composed final does not:
the human partner's call".

An extension is `manifest-extend.tsv`, two rows (`p3`, `p4`) with the same
pins. It is written and committed before it launches. Stage 1 is not
extended: at n=20 the treatment's 20 sessions are read against stage 1's 10.

**Manipulation check.** An auto-compaction in the window, read by `tally.py`
from the first `brainstorming` Skill call to the first `start-server.sh`,
`AskUserQuestion`, or human message after it. Stage 1 had one in all 10
sessions, and it is expected in every session here. A session with no window
(no Skill call, or no decision point after it) counts as a miss. Sessions
that miss stay counted and are named in Results. If more than a fifth miss
(3 or more of 10, 5 or more of 20), no reading is taken and the human
partner decides.

**Consequence.**
- **The fix holds:** the commit is proposed for the release branch
  `external-workflow-adoption` with this evidence. BACKLOG item 1 closes
  when the human partner approves it.
- **The fix fails:** the change does not ship. The hand-read informs the next
  candidate, which gets its own pre-registration. No rewording is measured
  against this campaign's sessions.
- **The human partner's call:** as stated.

**Hand-read.** Every counted session that does not start the companion is
read by hand and classified with stage 1's classes:
- (a) asked the layout choice through `AskUserQuestion`: the field shape.
  Note whether a Deciding Together comparison preceded it in chat.
- (b) described the layouts in chat only, in prose or ASCII, with no
  selection widget;
- (c) never reached a layout choice: it implemented directly, or asked only
  non-visual questions;
- (d) other, described.

Each hand-read also records whether `brainstorming` was invoked through the
Skill tool, and whether the design placed the filters without offering the
placement as a choice. Every started session whose composed final did not
pass is also read by hand, naming the criterion it failed. The deterministic
count governs the reading; the hand-read explains it.

**Readouts, with no reading attached.** From `tally.py`, split by started and
not started:
- a compaction in the window;
- whether the last summary before the decision point names the visual
  companion;
- whether `visual-companion.md` was read;
- for started sessions, whether an `AskUserQuestion` came before the first
  `start-server.sh`.

By hand, for every started session: what its first companion screen showed
(placements, controls, or both). For every session: the path it announced
(spike, bounded, architectural).

## Void Attempts

Fixed before the runs, per the evals void-attempt rule, the same as stage 1:

- **Grader exit** (`verdict.json` status `investigate`, "gauntlet exited
  ... without writing a result", transport error in
  `gauntlet-agent/gauntlet-stderr.log`): replaced. At most three further
  attempts.
- **Harness setup** (null `gauntlet`, "quorum error (setup): setup.sh failed",
  the sandbox EPERM signature): relaunched. Does not consume the cap.
- **A real indeterminate** (the coding agent failed, stalled, or produced no
  usable transcript, or the Gauntlet-Agent returned `investigate` on a
  completed session): re-run once. Indeterminate twice stays indeterminate.
  The primary measure is deterministic, so a session that ran
  `start-server.sh` counts as started whatever the composed final says, and
  one that did not counts as not started. If an indeterminate decides the
  reading, Results says so.
- **Claude Code version** (a session whose transcript records any version
  other than 2.1.287 alone): replaced while the host is still at 2.1.287.
  Does not consume the cap. If the host has moved on,
  `logs/measure-launch.sh` refuses to launch; Results then reports the count
  without a reading, and the human partner decides whether to re-pin.

Every void attempt is recorded here with its stderr.

## Mutation Checks

`logs/batch-window-start.txt` holds an epoch stamp written immediately before
launch. The checks run before the batch, after the counted sessions, and after
archiving. Each time:
- `find` over the worktree outside `.git` reports no file newer than the
  stamp;
- the worktree's `HEAD` equals db33b7e;
- `git status --short` is empty.

## Limits

- **Scope.** One scenario, one model, one Claude Code version, one fixture.
- **A historical control.** Stage 1 ran 2026-10-02 06:23:40Z to 07:15:59Z.
  The treatment runs later on the same host and pins. Drift in the served
  model between the two is not controlled.
- **Over-triggering is not measured.** No scenario checks that the companion
  stays closed on a change that puts nothing on a page. A reader could take
  "screen" to cover a command-line tool's terminal output.
- **Host `/tmp` is shared.** Sessions that check the page with headless
  Chrome write to literal host `/tmp` paths, outside the run directory, and
  concurrent sessions can share them. In the twin every first use came after
  the design approval or the companion start. The twin's and stage 1's
  leftovers were deleted before this batch. Results lists the paths and says
  whether any use preceded the decision point; those files are not archived.
- **The default window is not re-measured.** The twin showed the failure
  without the compaction. Whether the treatment also lifts the twin's 4 of
  10 is not tested here.

## Files

- `manifest.tsv`, and `manifest-extend.tsv` if an extension runs.
- `launch-all.sh`, copied unchanged from the twin.
- `logs/measure-launch.sh`, adapted from the twin's: the evidence directory,
  and the treatment arm as the only arm.
- `archive-runs.sh`, adapted from the twin's: the evidence directory and the
  arm.
- `logs/`: one log per row with the pins, the command, and quorum's `trials:`
  output, plus `batch-window-start.txt` and `launch-all.out`. Replacements
  and re-runs under the void rules are logged as `r<n>`.
- `runs/treatment/<run-id>/`: the run archives, stripped per `../README.md`.
- `tally.py` and its output `tally.txt`: the decision rules over the archive.
- `handread.md`: the hand-reads named above.

## Results

Pending.
