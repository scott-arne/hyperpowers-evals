# Visual Companion at the Default Window at the Shipping Head (2026-10-02)

Pre-registered before the first counted session. The rules below were fixed
and committed before any counted run launched; results are appended under
Results.

## Question

Stage 1 (`../2026-10-02-companion-after-compaction/`, results at 734790aea)
ran `brainstorming-bounded-companion-after-compaction` at the shipping head.
The companion started in 5 of 10 sessions, so that scenario reproduces the
field failure. In all 10, an auto-compaction landed between the skill load
and the decision point, and the last summary before that point named the
visual companion.

So the summary dropping the companion step is not needed for the failure.
Stage 1 cannot say whether the compaction contributes at all, because every
session compacted. Each compaction re-attached the brainstorming skill cut at
20000 characters, inside the Visual Companion section. The per-question test,
its examples, and the pointer to `visual-companion.md` were lost.

This campaign removes the compaction and keeps the rest of the fixture. It
asks: with the same brief, handoff note and required reading at Claude Code's
default compaction window, how often does the shipping head start the
companion? The answer separates two accounts of stage 1's failures:
- **The failure reproduces without the compaction.** It lives in the trigger:
  the agent does not treat where the filters sit on the page as a visual
  question. Stage 1's hand-read fits this: all five failures put the filters
  above the table without offering the placement as a choice.
- **The compaction contributes.** The truncated re-attach removes what makes
  sessions open the companion.

## Scenario

`brainstorming-bounded-companion-default-window`, committed at the harness
pin together with stage 1's scenario. Its `setup.sh` runs stage 1's
`setup.sh` with `COMPANION_NO_WINDOW=1`. The two fixtures share the brief,
the handoff note, the fixture `CLAUDE.md`, and the four guideline documents.
They cannot drift. The one difference: no `.claude/settings.json` is written,
so Claude Code's default window applies instead of `autoCompactWindow`
100000. The story and the graded criteria are stage 1's. `pre()` checks that
the settings file is absent.

The field compactions fired at 166801 to 168828 context tokens (stage 1's
Question table). By the scenario's own estimate, a session reaches its first
question at about 80k: roughly 27k after the skill load, plus about 53k of
required reading. No compaction is expected in the window. The manipulation
check below reads whether one landed anyway.

## Arm

- **shipping head:** hyperpowers `external-workflow-adoption` at 5f4ab78,
  detached worktree `.worktrees/companion-baseline`. Its arm label is
  `control`. This is stage 1's arm and tree.

Stage 1's arm is not re-run. Its committed count, 5 of 10, is a fixed
reference (see Decision Rules).

## Pins

In `manifest.tsv`:
- harness 032de5a, the commit that adds both scenarios and stage 1's harness
  pin (evidence commits may follow it; harness paths may not);
- control 5f4ab78;
- model `claude-opus-5-5` via `claude-auto`.

**Grader:** the Gauntlet-Agent on `claude-opus-5-5`. Gauntlet's in-code
default is `claude-sonnet-4-6`. The host environment sets
`GAUNTLET_AGENT_MODEL=claude-opus-5-5`, which is how stage 1 graded on
`claude-opus-5-5` (its Grader correction). `logs/measure-launch.sh` refuses
to launch unless `GAUNTLET_AGENT_MODEL` is `claude-opus-5-5`, and records it
in each row log. Each archived `result.json` records the grader model.

**Budget** `default`: `SLASH_COMMAND_TOOL_CHAR_BUDGET` and
`INTERLOCK_PROBE_TRACE` unset. `ANTHROPIC_DEFAULT_OPUS_MODEL` is unset; each
row log records it.

**Claude Code 2.1.287**, pinned as in stage 1:
- `logs/measure-launch.sh` refuses to launch unless `claude --version` is
  2.1.287, and logs the version before and after each row;
- `tally.py` voids any session whose transcript records a version other than
  2.1.287 alone (see Void Attempts).

**Host instruction files.** As in stage 1, sessions do not load the host
`CLAUDE.md` files above the run directory (since evals 74d2482). The field
sessions loaded the human partner's global file.

Checked before this file was committed:
- `claude --version` prints 2.1.287;
- `.worktrees/companion-baseline` is at 5f4ab78 with a clean tree;
- the evals harness paths are clean and identical to the harness pin;
- `GAUNTLET_AGENT_MODEL` is `claude-opus-5-5` in the launch shell.

`logs/measure-launch.sh` repeats all four on every row.

There is no pilot. The fixture is stage 1's, built by the same `setup.sh`,
and only the settings file is left out. A setup failure is a void attempt
(see Void Attempts).

## Size

2 manifest rows, each one `quorum run --repeat 5` process: 10 sessions, 2
concurrent.

## Decision Rules

**Primary measure.** As in stage 1, a session counts as started when its
deterministic post-check `tool-arg-match Bash --matches 'command=start-server[.]sh'`
passes. The composed final is reported beside it.

**Two references.** Each count is read against two one-sided Fisher exact
tests:
- **Stage 1, 5 of 10:** whether this arm starts the companion more often than
  stage 1 did. At n=10, p is 0.672 at 5, 0.500 at 6, 0.325 at 7, 0.175 at 8,
  0.070 at 9 and 0.016 at 10. At n=20 (stage 1 stays at 5 of 10), p is 0.169
  at 15, 0.104 at 16, 0.056 at 17, 0.026 at 18, 0.009 at 19 and 0.002 at 20.
- **A perfect fix, n of n:** whether a fix could still separate from this
  arm, as in stage 1. At n=10, p is 0.043 at 6, 0.105 at 7 and 0.237 at 8. At
  n=20, it is 0.024 at 15 and 0.053 at 16.

| Default window, started | Reading |
|---|---|
| 6 or fewer of 10 | reproduces without the compaction: a fix can separate from it (perfect-fix p <= 0.043) |
| 7, 8 or 9 of 10 | extended once to n=20 |
| 10 of 10 | the compaction contributes (p 0.016 against stage 1) |
| 15 or fewer of 20 | reproduces without the compaction (perfect-fix p <= 0.024) |
| 16 or 17 of 20 | not separated: the human partner's call |
| 18 or more of 20 | the compaction contributes (p <= 0.026 against stage 1) |

A "reproduces" reading does not rule out a smaller contribution from the
compaction. It says the failure persists without it.

An extension is `manifest-extend.tsv`, two rows (`p3`, `p4`) with the same
pins. It is written and committed before it launches. Stage 1 is not
extended.

**Consequence.** In every case, the fix is written under
`hyperpowers:writing-skills` and measured on the compaction scenario, with
stage 1 as its control and its own pre-registration. That scenario carries
the field condition, a compaction before the first question, and the fix has
to hold under it.
- **Reproduces without the compaction:** the fix targets the trigger, making
  where things sit on the page an explicit visual question. Bringing
  `SKILL.md` under the re-attach cap is not pursued as the fix on its own.
- **The compaction contributes:** the fix restores what the compaction
  removes. It moves the companion how-to ahead of the 20000-character cut, or
  brings `SKILL.md` under it. This arm's count is the level the fix should
  reach.
- **Not separated:** the human partner's call.

**Manipulation check.** An auto-compaction in the window, read by `tally.py`
from the first `brainstorming` Skill call to the first `start-server.sh`,
`AskUserQuestion`, or human message after it. Expected in no session.
Sessions where one lands stay counted and are named in Results. If one lands
in more than a fifth of the counted sessions (3 or more of 10, 5 or more of
20), no reading is taken and the human partner decides.

**Hand-read.** The classes are stage 1's. Every counted session that does not
start the companion is read by hand and classified as one of:
- (a) asked the layout choice through `AskUserQuestion`: the field shape.
  Note whether a Deciding Together comparison preceded it in chat.
- (b) described the layouts in chat only, in prose or ASCII, with no
  selection widget;
- (c) never reached a layout choice: it implemented directly, or asked only
  non-visual questions;
- (d) other, described.

Each hand-read also records whether `brainstorming` was invoked through the
Skill tool, and whether the design placed the filters without offering the
placement as a choice. The deterministic count governs the reading; the
hand-read explains it.

**Readouts, with no reading attached.** From `tally.py`, split by started and
not started:
- a compaction in the window;
- whether the last summary before the decision point names the visual
  companion, for sessions that compacted before it;
- whether `visual-companion.md` was read;
- for started sessions, whether an `AskUserQuestion` came before the first
  `start-server.sh`.

The path each session announced (spike, bounded, architectural) is read by
hand.

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
- the worktree's `HEAD` equals 5f4ab78;
- `git status --short` is empty.

## Files

- `manifest.tsv`, and `manifest-extend.tsv` if an extension runs.
- `launch-all.sh`, copied unchanged from stage 1.
- `logs/measure-launch.sh`, adapted from stage 1's: the evidence directory,
  and the grader model check and record. `launch-all.sh` accepts only
  `harness`, `control`, `treatment` and `model` as two-field manifest keys,
  so the grader pin lives in the script with the Claude Code pin.
- `archive-runs.sh`, adapted from stage 1's: the evidence directory, no pilot
  arm, and each copy built under `<run-id>.partial` and renamed only once it
  is complete. Stage 1's copy failed partway in the sandbox, and its script
  then skipped the partial copy as archived.
- `logs/`: one log per row with the pins, the command, and quorum's `trials:`
  output, plus `batch-window-start.txt` and `launch-all.out`. Replacements
  and re-runs under the void rules are logged as `r<n>`.
- `runs/control/<run-id>/`: the run archives, stripped per `../README.md`.
- `tally.py` and its output `tally.txt`: the decision rules over the archive.
- `handread.md`: the hand-read of every counted session that does not start
  the companion.

## Results

Pending.
