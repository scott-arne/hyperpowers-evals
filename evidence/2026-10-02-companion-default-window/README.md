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

**The failure reproduces without the compaction.** At Claude Code's default
window, the shipping head started the companion in 4 of 10 sessions, and no
session compacted. That is not more often than stage 1's 5 of 10 (one-sided
Fisher p 0.815). Against the best a fix could do, 10 of 10, p is 0.005. Per
the pre-registered consequence, the fix targets the trigger: it makes where
things sit on the page an explicit visual question. Bringing `SKILL.md`
under the re-attach cap is not pursued as the fix on its own. The fix is
written under `hyperpowers:writing-skills` and measured on the compaction
scenario, with stage 1 as its control and its own pre-registration. This
reading does not rule out a smaller contribution from the compaction.

| Shipping head, default window | Started (`tool-arg-match`) | Composed final | `brainstorming` skill-called | Compaction in the window | Reading |
|---|---|---|---|---|---|
| `brainstorming-bounded-companion-default-window` | 4/10 | 4/10 | 10/10 | 0/10 | reproduces without the compaction |

The composed final matched the started count session for session: every
started session passed and every other session failed.

**Manipulation check.** No compaction landed in the window, and none landed
anywhere in any session. The reading stands.

**Readouts, with no reading attached.** From `tally.txt`:
- No session compacted, so the summary readout has no sessions.
- `visual-companion.md` was read in 4 of the 4 started sessions and in none
  of the 6 others.
- 3 of the 4 started sessions called `AskUserQuestion` before their first
  `start-server.sh`. The fourth, `092955Z-f2d8`, asked its two questions in
  chat.
- Nine sessions announced the bounded path: all six that did not start the
  companion, and `091214Z-ae41`, `092955Z-f2d8` and `085500Z-38a9`.
  `092157Z-664e` named none. In stage 1, two of ten announced a path.
- Every counted session ran Claude Code 2.1.287 on `claude-opus-5-5` alone.

**Hand-read** (`handread.md`). All six sessions that did not start the
companion are (a); none is (b), (c) or (d).
- Each sent a control question through `AskUserQuestion`, with no Deciding
  Together comparison before it: four the event-type control, two only the
  week control (a week select or a date range). Stage 1's README treats the
  week picker as the same kind of question as the type picker, and the
  hand-read keeps that reading.
- Each design put the filters above the table (two of them between the
  intro and the table) without offering the placement as a choice, and the
  operator approved it.
- `093354Z-9ad4` is the only session in either campaign whose visible text
  weighs the companion and declines it: "The layout is two dropdowns above
  the table, which is simple enough to describe in text, so I'm not opening a
  browser mockup."
- **Started sessions, for contrast.** All four opened with three candidate
  layouts. `085500Z-38a9` sent the event-type control question to
  `AskUserQuestion` first, as four of the failures did, after a comparison in
  chat, and then opened the companion on layouts that "use the same controls
  and differ only in placement".

**What this changes in the Question's account.** Stage 1 could not say
whether the compaction contributes, because every session compacted. Here no
session compacted, and the count did not rise. So the truncated re-attach is
not needed for the failure. Stage 1 had already shown that the summary
dropping the step is not needed either: the summary named the companion in
all 10 sessions. What the failures share across both campaigns is the
trigger. In all 11 (five in stage 1, six here), the design placed the
filters without offering the placement as a choice. The started sessions
made layout its own question: here all four opened with three candidate
layouts, and in stage 1 four of the five named the placement as the next
question or put it on screen directly.

The class mix differs from stage 1: there, three failures never asked a
control question (c) and two did (a); here all six did. This campaign was
not sized to compare class mixes, and no reading is attached.

**Grader.** Both row logs record `gauntlet_agent_model=claude-opus-5-5`.
Each archived `result.json` records `config.model` as `claude-opus-5-5`, in
all 10 counted runs.

**Host state outside the run directory.** Nine of the ten sessions, after the
design was approved, drove headless Chrome over the DevTools protocol to
check the page. They wrote their scripts, screenshots and Chrome profiles to
literal paths under the host `/tmp`, outside the run directory, and those
files are not archived. Four sessions (`091214Z-ae41`, `091503Z-817d`,
`092157Z-664e`, `092321Z-6d1b`) used `/tmp/actcheck`, which a stage 1
session had created at 07:14Z. The concurrent pair ae41 and 817d used it at
overlapping times (09:21:22Z to 09:21:46Z). In every session the first host
`/tmp` use came after the design approval or the companion start, so the
primary measure is not affected. Run `093354Z-9ad4` also left two Chrome
profiles in its throwaway home (`home/.tmp/cdp-hBPHZj` and
`home/.tmp/cdp-01v0Bq`, 18 MB of caches and icons). They were removed from
the archive copy only, and `results/` keeps them.

**Runs.**
- One batch: 2 rows of `--repeat 5`, 10 sessions, 2 concurrent. The rows'
  `trials:` lines read `FFPPP` (p1) and `PFFFF` (p2).
- The stamp was written at 08:54:49Z, the rows launched at 08:54:59Z, and
  the last `DONE` came at 09:41:31Z.
- No extension: the count did not land on 7, 8 or 9 of 10, and
  `manifest-extend.tsv` was not written.
- There were no grader voids, setup voids, version voids or indeterminates,
  so `superseded.txt` was not written.
- The mutation checks passed before the batch, after the counted sessions and
  after archiving. No file in the worktree outside `.git` was newer than the
  stamp, `HEAD` stayed at 5f4ab78, and `git status --short` stayed empty.
- `tally.txt` is `tally.py` over the archive.
