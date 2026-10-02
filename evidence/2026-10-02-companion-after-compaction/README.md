# Visual Companion After Compaction at the Shipping Head (2026-10-02)

Pre-registered before the first counted session. The rules below were fixed
and committed before any counted run launched; results are appended under
Results.

## Question

The baseline (`../2026-10-01-companion-baseline/`, results at c076bb8e4) ran
`brainstorming-bounded-fires-visual-companion` at the shipping head. The
companion started in 10 of 10 sessions, so that scenario does not reproduce
the field failure.

The baseline explained the gap by saying each field visual question came
several questions into the brainstorm. For the first visual question of each
field brainstorm, that is wrong. A closer read of the three predict-before-structure
brainstorms shows:

| Brainstorm | Skill loaded | Auto-compaction (context tokens before) | First question |
|---|---|---|---|
| B | 2026-09-29T07:39:15Z | 07:40:41Z (167629) | "Layout", 07:41:54Z |
| C | 2026-09-30T05:41:08Z | 05:44:12Z (168828) | "Chain layout", 05:45:00Z |
| D | 2026-10-01T04:35:32Z | 04:36:52Z (167709) and 04:40:16Z (166801) | "Grid layout", 04:41:00Z |

In each brainstorm the first question was the visual one, and it went to
`AskUserQuestion`. An auto-compaction landed between the skill load and that
question. The later visual questions (B's second "Layout" and "Density map",
D's "3D colour") came after further compactions.

A compaction can lose the companion in two ways:
- **The re-attached skill is truncated.** Claude Code re-attaches an invoked
  skill after compaction, capped at 20000 characters. The re-attached
  brainstorming content is exactly 20000 characters in the field sessions and
  on Claude Code 2.1.284 and 2.1.287. The cut falls inside the Visual
  Companion section, mid-sentence in "Per-question decision". The section
  header and the "Using the companion (just-in-time)" paragraph survive. The
  per-question test, its examples, and the pointer to `visual-companion.md`
  are cut, as is everything after. `visual-companion.md` holds the
  `start-server.sh` command.
- **The summary carries the plan.** None of the four in-window field
  summaries (one each in B and C, two in D) names the visual companion. Their
  "companion" mentions are the Codex companion.

This campaign asks: when an auto-compaction lands between the skill load and
the first question of a field-shaped bounded brainstorm, does the shipping
head open the companion? If it fails often enough, this scenario is the
failing test a fix is measured against.

## Scenario

`brainstorming-bounded-companion-after-compaction`, committed at the harness
pin. Its graded criteria are those of `brainstorming-bounded-fires-visual-companion`.
The fixture differs in four ways:
- **A feature-shaped brief.** The user asks for a way to narrow down a
  48-event account activity table. The layout of the filter controls is the
  visual question, and it arises inside the feature. The brief carries no
  visual cue.
- **A handoff note.** `NOTES.md` stands in for the durable state the field
  summaries had to carry. The fixture `CLAUDE.md` requires reading it at
  session start.
- **Required reading.** Four UI guideline documents, about 48k tokens
  together, which the fixture `CLAUDE.md` requires reading before any page
  change.
- **A small window.** `.claude/settings.json` sets `autoCompactWindow` to
  100000, the smallest value Claude Code accepts. Compaction fires at about
  67k context tokens, which the required reading crosses after the skill
  load.

Whether a compaction landed in the window is a per-session readout, not a
check. A session where it did not land is still a valid bounded-companion
session.

The twin `brainstorming-bounded-companion-default-window` builds the same
fixture through the same `setup.sh`, without the settings file. It is
committed with this campaign and is not run in it.

## Pilots

Development pilots, not counted.

**Earlier fixture.** A settings-page relayout brief with no handoff note
(fixture commit trees f47de6f and 251d93e). Four pilots: `20261002T000204Z-c831`
and `20261002T000542Z-b4db` passed; `20261002T000227Z-8cf0` and
`20261002T000519Z-56f2` ended without a verdict. All four compacted between
the skill load and the companion start. Three compacted before their first
question; `b4db` compacted after its first question ("Scope"). The last
summary before the decision named the companion in all three that had one,
and all four started the companion. They are not archived; their run
directories remain under `results/`.

**Committed fixture** (fixture commit tree cf929a4, which the committed
`setup.sh` still builds; two comments, in `setup.sh` and `checks.sh`, were
corrected after the pilots to match the window `tally.py` reads). Launched
with `quorum run --repeat 1` outside
`logs/measure-launch.sh`. Archived under `runs/pilot/`, with their launch
output in `logs/pilot-<n>.log`:

| Pilot | Run | Claude Code | Started | Final | Auto-compactions (context tokens before) | `AskUserQuestion` headers and the companion start, in order |
|---|---|---|---|---|---|---|
| 1 | `20261002T015611Z-cd27` | 2.1.284 | yes | grader void (socket closed) | 61095, 79886 | Filters, start, Security, Tokens, Empty state |
| 2 | `20261002T051427Z-0c7a` | 2.1.287 | no | fail | 65304, 68594 | Filters, Type picker, Tokens, No-JS gap |
| 3 | `20261002T053216Z-3222` | 2.1.287 | yes | pass | 62121, 80345, 66938 | Filters, Week picker, start, Tokens |

Pilot 1's archive has no `result.json`: the Gauntlet-Agent's connection
closed and Gauntlet exited without writing one. Its session transcript and
`verdict.json` are archived.

What the pilots show:
- In all three, a compaction landed before the first question, and the last
  summary before it names the companion. None of the four field summaries
  did.
- In all three, the first question was non-visual: which filters to build.
  In the field, the first question was the visual one.
- Pilot 2 failed anyway. Its control question ("Type picker": a checkbox
  list, a grouped select, or a single-type select) went to
  `AskUserQuestion`, and it presented the layout in prose.
- Pilot 3 sent the same kind of question ("Week picker") to
  `AskUserQuestion`, then started the companion. It read
  `visual-companion.md` with `cat` through Bash.

So the scenario reproduces the compaction in the window and the truncated
re-attach. It does not reproduce the summary dropping the companion, or the
visual question coming first. Three pilots cannot say how often it fails.

## Arm

- **shipping head:** hyperpowers `external-workflow-adoption` at 5f4ab78,
  detached worktree `.worktrees/companion-baseline`. Its arm label is
  `control`.

5f4ab78 is the baseline's 4fe932e after the 2026-10-01 history rewrite
(hyperpowers `docs/hyperpowers/history-rewrite-2026-10-01.tsv`). It is the
same tree, so the same brainstorming skill all three field brainstorms
loaded, with D's bootstrap.

## Pins

In `manifest.tsv`:
- harness: the commit that adds the two scenarios (evidence commits may
  follow it; harness paths may not);
- control 5f4ab78;
- model `claude-opus-5-5` via `claude-auto`.

Grader: the Gauntlet-Agent on `claude-opus-5-5`, Gauntlet's default
(`GAUNTLET_AGENT_MODEL` is unset). Budget `default`:
`SLASH_COMMAND_TOOL_CHAR_BUDGET` and `INTERLOCK_PROBE_TRACE` unset.
`ANTHROPIC_DEFAULT_OPUS_MODEL` is unset; each row log records it.

**Claude Code 2.1.287.** The host binary auto-updated from 2.1.284 to 2.1.287
between pilots 1 and 2, so the version is pinned three ways:
- `logs/measure-launch.sh` refuses to launch unless `claude --version` is
  2.1.287, and logs the version before and after each row;
- `tally.py` voids any control session whose transcript records a version
  other than 2.1.287 alone (see Void Attempts);
- 2.1.283, 2.1.284 and 2.1.287 remain installed.

**Host instruction files.** Since evals 74d2482, sessions no longer load the
host `CLAUDE.md` files above the run directory. The field sessions loaded
the human partner's global file. This is a known difference from the field.
The baseline's sessions loaded it too.

Checked before this file was committed:
- `claude --version` prints 2.1.287;
- `.worktrees/companion-baseline` is at 5f4ab78 with a clean tree;
- the evals harness paths are clean at the harness pin.

`logs/measure-launch.sh` repeats all three on every row.

## Size

2 manifest rows, each one `quorum run --repeat 5` process: 10 sessions, 2
concurrent.

## Decision Rules

**Primary measure.** A session counts as started when its deterministic
post-check `tool-arg-match Bash --matches 'command=start-server[.]sh'`
passes. The composed final is reported beside it.

**The reference.** As in the baseline, no prior rate is assumed. A fix can do
no better than 10 of 10. Its one-sided Fisher exact p against this arm's
count:
- at n=10: 0.500 at 9, 0.237 at 8, 0.105 at 7, 0.043 at 6 and 0.016 at 5;
- at n=20 (20 of 20 against): 0.115 at 17, 0.053 at 16, 0.024 at 15 and
  0.010 at 14.

| Shipping head, started | Reading |
|---|---|
| 6 or fewer of 10 | reproduces the failure: a fix can separate from it at n=10 (p <= 0.043) |
| 7 of 10 | extended once to n=20 |
| 8 or more of 10 | does not reproduce: even a perfect fix cannot separate at n=10 (p >= 0.237) |
| 15 or fewer of 20 | reproduces the failure (p <= 0.024) |
| 16 or 17 of 20 | not separated: the human partner's call |
| 18 or more of 20 | does not reproduce |

An extension is `manifest-extend.tsv`, two rows (`p3`, `p4`) with the same
pins. It is written and committed before it launches.

**Consequence.**
- **Reproduces:** the default-window twin runs next at the same pins, with
  its own pre-registration, to separate the compaction from the brief and the
  handoff note. A candidate fix is then written under
  `hyperpowers:writing-skills` and measured on the scenario that fails, with
  this arm as its control and its own pre-registration.
- **Does not reproduce:** no skill change follows. The pilots point at the
  remaining difference: the field summaries dropped the companion step and
  this scenario's summaries keep it. A scenario that forces that would have
  to edit the summary or the transcript, which is no longer a natural
  session. Whether to build one is the human partner's call.

**Hand-read.** Every counted session that does not start the companion is
read by hand and classified as one of:
- (a) asked the layout choice through `AskUserQuestion`: the field shape.
  Note whether a Deciding Together comparison preceded it in chat.
- (b) described the layouts in chat only, in prose or ASCII, with no
  selection widget;
- (c) never reached a layout choice: it implemented directly, or asked only
  non-visual questions;
- (d) other, described.

Each hand-read also records whether `brainstorming` was invoked through the
Skill tool, whether a compaction landed in the window, and whether the last
summary before the first question names the companion. The deterministic
count governs the reading; the hand-read explains it.

**Readouts, with no reading attached.** From `tally.py`, split by started and
not started:
- a compaction in the window (from the first `brainstorming` Skill call to
  the first `start-server.sh`, `AskUserQuestion`, or human message after
  it);
- whether the last summary before that point names the visual companion;
- whether `visual-companion.md` was read;
- for started sessions, whether an `AskUserQuestion` came before the first
  `start-server.sh`.

The path each session announced (spike, bounded, architectural) is read by
hand.

## Void Attempts

Fixed before the runs, per the evals void-attempt rule, the same as the
baseline:

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

One rule is new:

- **Claude Code version** (a control session whose transcript records any
  version other than 2.1.287 alone): replaced while the host is still at
  2.1.287. Does not consume the cap. If the host has moved on,
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
- `launch-all.sh`, copied unchanged from `../2026-10-01-companion-baseline/`.
- `logs/measure-launch.sh`, adapted from the baseline's: the evidence
  directory and the Claude Code pin. `launch-all.sh` accepts only `harness`,
  `control`, `treatment` and `model` as two-field manifest keys, so the pin
  lives in the script.
- `archive-runs.sh`, adapted from the baseline's: the evidence directory and
  the pilot arm.
- `logs/`: the pilot launch output (`pilot-<n>.log`), one log per row with the
  pins, the command, and quorum's `trials:` output, plus
  `batch-window-start.txt` and `launch-all.out`. Replacements and re-runs
  under the void rules are logged as `r<n>`.
- `runs/pilot/<run-id>/` and `runs/control/<run-id>/`: the run archives,
  stripped per `../README.md`.
- `tally.py` and its output `tally.txt`: the decision rules over the archive,
  with the pilots printed first and never counted.
- `handread.md`: the hand-read of every counted session that does not start
  the companion.

## Results

Pending.
