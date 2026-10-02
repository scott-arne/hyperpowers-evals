# Visual Companion Baseline at the Shipping Head (2026-10-01)

Pre-registered before the first session. The rules below were fixed and
committed before any run launched; results are appended under Results.

## Question

In predict-before-structure (PBS), three brainstorms (sub-projects B, C and
D, 2026-09-29 to 2026-10-01) loaded the full brainstorming skill from the
`external-workflow-adoption` worktree. They ran on `claude-opus-5-5` under
Claude Code 2.1.283 and 2.1.284. Between them they asked six visual questions:
"Layout" twice, "Chain layout", "Grid layout", "Density map" and "3D colour".
Every one went to `AskUserQuestion`. None started the visual companion.

The only measurement of `brainstorming-bounded-fires-visual-companion` is
`docs/experiments/2026-08-20-visual-companion-path-scoping.md`, round 2. The
companion wording that shipped started the companion in 3 of 3 sessions on
`claude-opus-5`. That was before Deciding Together entered brainstorming
(hyperpowers f46c78c, 2026-08-28). Deciding Together routes any choice whose
options differ in what happens afterward to a comparison in chat and then the
selection widget, and it does not mention the companion.

This campaign asks: at the shipping head, on the field's model and Claude Code
version, does the bounded companion scenario reproduce the field failure? If
it does, it is the failing test a fix is measured against. If it does not,
the scenario's conditions differ from the field's in some way that matters,
and the next step is a scenario built on field conditions.

## Arm

- **shipping head:** hyperpowers `external-workflow-adoption` at 4fe932e,
  detached worktree `.worktrees/companion-baseline`. Its arm label in the
  manifest and logs is `control`.

`skills/brainstorming/` last changed on that branch at d6f3eb2 (2026-09-24),
so all three field brainstorms loaded this arm's brainstorming skill. The
bootstrap differs for two of them:
- The ladder was in `using-hyperpowers` from f18dc6d (2026-09-17T23:32Z) to
  its revert at 01616a5 (2026-09-30T23:27Z).
- B (2026-09-29T07:39Z) and C (2026-09-30T05:41Z) ran with it.
- D (2026-10-01T04:35Z) ran without it, as this arm does, and still sent
  "Grid layout" and "3D colour" to `AskUserQuestion`.

So this arm reproduces D's skill and bootstrap exactly.

## Pins

In `manifest.tsv`:
- harness 7eeb1e5 (evidence commits may follow, harness paths may not);
- control 4fe932e;
- model `claude-opus-5-5` via `claude-auto`.

Grader: Gauntlet `claude-opus-5-5` (`GAUNTLET_AGENT_MODEL`). Claude Code
2.1.284, checked at launch and read from every session transcript. Budget
`default`: `SLASH_COMMAND_TOOL_CHAR_BUDGET` and `INTERLOCK_PROBE_TRACE` unset.
The scenario is unchanged since d229377.

The launch environment carries `ANTHROPIC_DEFAULT_OPUS_MODEL=claude-opus-5`,
written by Claude Code's own third-party-provider probe. It only affects a
subagent dispatched with the `opus` alias. Each row log records it.

Checked before this file was committed:
- `claude --version` prints 2.1.284;
- `.worktrees/companion-baseline` is at 4fe932e with a clean tree;
- the evals harness paths are clean at 7eeb1e5.

`logs/measure-launch.sh` repeats the last two on every row.

## Size

2 manifest rows, each one `quorum run --repeat 5` process: 10 sessions, run
concurrently.

## Decision Rules

**Primary measure.** A session counts as started when its deterministic
post-check `tool-arg-match Bash --matches 'command=start-server[.]sh'`
passes. That is the behavior the field sessions never showed. The composed
final is reported beside it.

**The reference.** No prior rate is assumed. The question is whether this
scenario leaves enough failures for a fix to show an effect. A fix can do no
better than 10 of 10. Its one-sided Fisher exact p against this arm's count:
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
- **Reproduces:** a candidate fix is written under `hyperpowers:writing-skills`
  and measured on this scenario. This arm is its control. The treatment gets
  its own pre-registration.
- **Does not reproduce:** no skill change follows from this campaign. The
  next step is a scenario built on field conditions: an existing app with a
  design system, an architectural brainstorm, and a layout choice that arrives
  after several questions rather than in the opening brief. It gets its own
  pre-registration.

**Hand-read.** Every session that does not start the companion is read by
hand and classified as one of:
- (a) asked the layout choice through `AskUserQuestion`: the field shape.
  Note whether a Deciding Together comparison preceded it in chat.
- (b) described the layouts in chat only, in prose or ASCII, with no
  selection widget;
- (c) never reached a layout choice: it implemented directly, or asked only
  non-visual questions;
- (d) other, described.

Each hand-read also records whether `brainstorming` was invoked through the
Skill tool. The deterministic count governs the reading; the hand-read
explains it.

**Readouts, with no reading attached:**
- For sessions that started the companion: whether a Deciding Together
  comparison or an `AskUserQuestion` came before the first `start-server.sh`.
- The path each session announced (spike, bounded, architectural).

## Void Attempts

Fixed before the runs, per the evals void-attempt rule, the same as the main
boundary-gating campaign:

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

Every void attempt is recorded here with its stderr.

## Mutation Checks

`logs/batch-window-start.txt` holds an epoch stamp written immediately before
launch. The checks run before the batch, after the counted sessions, and after
archiving. Each time:
- `find` over the worktree outside `.git` reports no file newer than the
  stamp;
- the worktree's `HEAD` equals 4fe932e;
- `git status --short` is empty.

## Files

- `manifest.tsv`, and `manifest-extend.tsv` if an extension runs.
- `launch-all.sh`, copied unchanged from `../2026-09-23-adoption-remediation/`
  at b4ce1f5 (the version that records each child's status).
- `logs/measure-launch.sh`, adapted from `../2026-09-30-main-boundary-gating/`:
  the evidence directory, the control root, and one extra log line for the
  inherited Opus alias pin.
- `logs/`: one log per row with the pins, the command, and quorum's `trials:`
  output, plus `batch-window-start.txt` and `launch-all.out`. Replacements and
  re-runs under the void rule are logged as `r<n>`.
- `runs/control/<run-id>/`: the run archives, stripped per `../README.md`.
- `tally.py` and its output `tally.txt`: the decision rules over the archive.
- `handread.md`: the hand-read of every session that does not start the
  companion.

## Results

**The scenario does not reproduce the field failure.** The shipping head
started the companion in 10 of 10 sessions. Against the best a fix could do,
10 of 10, the one-sided Fisher p is 1.000. No skill change follows from this
campaign. Per the pre-registered consequence, the next step is a scenario
built on field conditions, with its own pre-registration.

| Shipping head | Started (`tool-arg-match`) | Composed final | `brainstorming` skill-called | Reading |
|---|---|---|---|---|
| `brainstorming-bounded-fires-visual-companion` | 10/10 | 10/10 | 10/10 | does not reproduce |

**Hand-read.** None. Every session started the companion, so no session
qualified and no `handread.md` was written.

**How the sessions reached the companion.** All ten took the same route:
1. invoked `brainstorming` through the Skill tool;
2. read the fixture (`git ls-files`, then `settings.html`, `settings.css`,
   `settings.js`, `README.md`, `package.json`);
3. read `visual-companion.md`;
4. ran `start-server.sh`, in the first turn, before any question or other
   message to the user beyond a one-line "Using brainstorming" preamble in
   six sessions;
5. put three layout sketches on screen (the same four groups in each, laid
   out differently) and asked which one in chat;
6. implemented the chosen layout after the Gauntlet-Agent's answer.

Each session had two user turns: the brief and the answer.

**Readouts, with no reading attached.**
- No session sent a Deciding Together comparison or called
  `AskUserQuestion` before its first `start-server.sh`. No session called
  `AskUserQuestion` at all.
- No session announced a path. None of the words spike, bounded or
  architectural appears in any session's messages, although the skill says
  to state the classification before the first question.
- Every counted session ran Claude Code 2.1.284 on `claude-opus-5-5` alone.

**Why this scenario and the field differ.** This is an observation for the
next scenario's design. The reading does not depend on it. In this scenario the
layout question is the opening brief, and the first visual question arrives
before any other question. In the field brainstorms, each visual question
arrived several questions into an architectural design conversation in an
existing application, after other choices had already gone through
`AskUserQuestion`. The next scenario should reproduce that order.

**Correction (2026-10-02).** The paragraph above is wrong about the first
visual question of each field brainstorm. In B, C and D the first question
after the skill load was the visual one ("Layout", "Chain layout", "Grid
layout"), and an auto-compaction landed between the skill load and that
question. Only the later visual questions came after other
`AskUserQuestion` choices. `../2026-10-02-companion-after-compaction/` gives
the timeline and builds its scenario on that order.

**Host instruction files in the sessions.** Every session's transcript
records three host `CLAUDE.md` files in context:
- `/Users/johnss51/.claude/CLAUDE.md`, the human partner's private global
  file;
- the hyperpowers repository's `CLAUDE.md`;
- the evals repository's `CLAUDE.md`.

The session's working directory is under the evals clone, which is under the
human partner's home. The same three files appear in every archived
transcript under `evidence/` from `2026-09-17-first-edit-interlock` (Claude
Code 2.1.276) onward. Transcripts from earlier campaigns (2.1.261) record no
`CLAUDE.md` at all, so whether those sessions loaded the files cannot be read
from them. `docs/eval-harness-portfolio.md` states that the private file does
not leak because `CLAUDE_CONFIG_DIR` suppresses it. For these runs that is no
longer true.

The field sessions ran with the global file too, so it does not separate
this scenario from the field. The two repository files are eval-only. Neither
mentions the visual companion. This is reported for the harness, not read
against the result.

**Runs.**
- One batch: 2 rows of `--repeat 5`, 10 sessions, 2 concurrent.
- The stamp was written at 07:50:36Z, the rows launched at 07:50:50Z, and the
  last `DONE` came at 08:07:58Z.
- No extension: the count did not land on 7 of 10.
- There were no grader voids, no setup voids and no indeterminates, so
  `superseded.txt` was not written.
- The mutation checks passed before the batch, after the counted sessions and
  after archiving. No file in the worktree outside `.git` was newer than the
  stamp, `HEAD` stayed at 4fe932e, and `git status --short` stayed empty.
- `tally.txt` is `tally.py` over the archive.
