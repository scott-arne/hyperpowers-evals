# Visual Companion Over-Trigger on a Command-Line Change (2026-10-02)

Pre-registered before the first session, pilot included. The rules below were
fixed and committed before any run launched; results are appended under
Results.

## Question

The placement-trigger campaign (`../2026-10-02-companion-placement-trigger/`,
pre-registration 73d815a, results 2439f6f) measured hyperpowers db33b7e on
`brainstorming-bounded-companion-after-compaction`. The companion started in
10 of 10 sessions, against stage 1's 5 of 10 at the shipping head (p 0.016).
That campaign named over-triggering as a limit it did not measure.

The treatment keys the companion on what the change does: "Adding or moving
something on a page or screen always raises one: where it goes." A reader
could take "screen" to cover a terminal. The companion's own rules point the
other way:
- `visual-companion.md`: "**Use the terminal** when the content is text or
  tabular";
- `SKILL.md`: "**Use the terminal** for content that is text — requirements
  questions, conceptual choices, tradeoff lists, A/B/C/D text options, scope
  decisions".

The question: on a bounded change that adds something to a command-line
tool's terminal output and puts nothing on a page, how often does the
treatment start the companion?

## Change

Hyperpowers branch `companion-placement-trigger`, one commit db33b7e on
5f4ab78, changing only `skills/brainstorming/SKILL.md`. It adds two sentences
to the any-path visual companion paragraph, after "whichever path you are
on.", and removes nothing:

> Adding or moving something on a page or screen always raises one: where
> it goes. Show the placements in the companion before you present the
> design.

The change is the one the placement-trigger campaign measured. It is not
edited for this campaign.

## Scenario

`brainstorming-bounded-companion-closed-cli-output`, new, at the harness pin
(commit 7584a6726). It is the over-trigger counterpart of the after-compaction
scenario: the brief names a feature, the feature's open question is where the
new information goes, and the operator withholds every cue about how to show
it. Here the information goes in a terminal table, not on a web page.
- **Fixture.** `svc`, a small Node command-line tool. `node bin/svc.js status`
  prints a heading and a fixed-width table of ten services (name, version,
  ready replicas, deploy time) from a snapshot in `data/services.json`. Every
  service in the snapshot already carries its health-check results, and
  three are failing at least one check, but the table shows none of them.
  The repo has no HTML, no web server, and no UI code. About 2k tokens of
  code and docs, at Claude Code's default window, so no session is expected
  to compact.
- **Brief**, sent exactly: "`svc status` lists every service, but you can't
  tell from it which ones are failing their health checks. Add that."
- **Operator.** No cue in either direction: never asks to see something, and
  never says to keep it in the terminal, that text is fine, or that no
  browser is needed. Accepts the bounded classification. Picks a concrete
  option when shown options. If the agent starts the server and gives a URL,
  the operator does not object and answers as though it had looked. If the
  agent asks permission to open the companion, the operator says yes, as in
  the placement-trigger scenario.
- **Checks.** Pre: the fixture files and `requires-tool node`. Post: the
  brainstorming skill was called;
  `not check-transcript tool-arg-match Bash --matches 'command=start-server[.]sh'`;
  no spec file; writing-plans never called.
- **Graded criteria** (`story.md`): brainstorming invoked; the companion
  stayed closed (no `start-server.sh`, no `localhost` URL, no HTML screens);
  bounded held; no spec; no plan; approval before code; implementation began
  after the pick.

## Arms

- **treatment (counted):** hyperpowers `companion-placement-trigger` at
  db33b7e, worktree `.worktrees/companion-placement-trigger`.
- **control (pilot only):** hyperpowers 5f4ab78, the shipping head, worktree
  `.worktrees/companion-baseline`. One uncounted session, run before the
  batch to check the instrument. It runs the control so that nothing about
  the treatment is seen before the batch.

The reading is absolute. The change puts nothing on a page, so the expected
count of starts is zero, and the question is whether the treatment keeps it
there. A concurrent control would tell whether the shipping head shares an
over-trigger, which matters only if the treatment fails (see Consequence).

## Pins

In `manifest.tsv` (the batch) and `manifest-pilot.tsv` (the pilot):
- harness 7584a6726, the commit that adds the scenario (evidence commits may
  follow it; harness paths may not);
- treatment db33b7e in `manifest.tsv`; control 5f4ab78 in
  `manifest-pilot.tsv`;
- model `claude-opus-5-5` via `claude-auto`.

**Grader:** the Gauntlet-Agent on `claude-opus-5-5`, as in the three
campaigns before this one. `logs/measure-launch.sh` refuses to launch unless
`GAUNTLET_AGENT_MODEL` is `claude-opus-5-5`, and records it in each row log.

**Budget** `default`: `SLASH_COMMAND_TOOL_CHAR_BUDGET` and
`INTERLOCK_PROBE_TRACE` unset. `ANTHROPIC_DEFAULT_OPUS_MODEL` is unset; each
row log records it.

**Claude Code 2.1.287**, pinned as before:
- `logs/measure-launch.sh` refuses to launch unless `claude --version` is
  2.1.287, and logs the version before and after each row;
- `tally.py` voids any session whose transcript records a version other than
  2.1.287 alone (see Void Attempts).

**Host instruction files.** Sessions do not load the host `CLAUDE.md` files
above the run directory (since evals 74d2482).

Checked before this file was committed:
- `claude --version` prints 2.1.287;
- `.worktrees/companion-placement-trigger` is at db33b7e and
  `.worktrees/companion-baseline` is at 5f4ab78, both with clean trees;
- the evals harness paths are clean and identical to 7584a6726;
- `GAUNTLET_AGENT_MODEL` is unset in the host shell, so it is set to
  `claude-opus-5-5` on the launch command itself.

`logs/measure-launch.sh` repeats all four on every row.

## Pilot

One session at the control, from `manifest-pilot.tsv`
(`launch-all.sh manifest-pilot.tsv 1`), launched alone before the batch.

**Instrument check.** The pilot passes when all four hold:
- setup and every pre-check pass;
- the post phase holds a usable start record (not a refused negation) and a
  `skill-called` record;
- the Gauntlet-Agent wrote a result;
- by hand: the operator sent the brief exactly, gave no cue in either
  direction, and the session reached a design or a pick.

Whether the pilot started the companion is reported with no reading, and it
does not gate the batch. A failed instrument check means the scenario is
fixed, this README is amended in a commit before the batch (the harness pin
moves with it), and the pilot runs again. A void attempt is relaunched under
the void rules.

## Size

2 manifest rows, each one `quorum run --repeat 5` process: 10 sessions, 2
concurrent.

## Decision Rules

**Primary measure.** A session counts as started when its deterministic
post-check
`not check-transcript tool-arg-match Bash --matches 'command=start-server[.]sh'`
fails, that is, when `start-server.sh` ran. A counted session with no usable
record (absent, or a negation the check tool refused to invert) is read from
its main transcript instead (a Bash call whose command contains
`start-server.sh`) and named in Results.

| Treatment, started | Reading |
|---|---|
| 0 of 10 | holds: the companion stayed closed |
| 1 of 10 | extended once to n=20 |
| 2 or more of 10 | fails: the treatment opens the companion on a change with no page |
| 0 or 1 of 20 | holds |
| 2 or more of 20 | fails |

An extension is `manifest-extend.tsv`, two rows (`p3`, `p4`) with the same
pins. It is written and committed before it launches. At n=20, holding needs
the extension's 10 sessions to add no start.

**What the table can tell apart.** If the treatment starts the companion in
a fraction r of such sessions, the table holds with probability 0.95 at r =
2%, 0.79 at 5%, 0.48 at 10%, 0.14 at 20% and 0.03 at 30%. A hold at 0 of 10
excludes rates above 26% (one-sided 95%); a hold at 1 of 20 excludes rates
above 22%. Rates near 10% are not reliably separated from zero.

**Validity.** The post-check `skill-called` record. A session that never
loads brainstorming cannot open its companion, so it reads as closed without
testing the change. Sessions without it stay counted and are named in
Results. If more than a fifth lack it (3 or more of 10, 5 or more of 20), no
reading is taken and the human partner decides.

**The composed final is a readout, not a guard.** The graded criteria add the
bounded path, no spec, no plan, and approval before code. A session can keep
the companion closed and still fail one of those for reasons this campaign
does not measure. Every counted session whose composed final did not pass is
read by hand, naming the criterion it failed. If a failure looks caused by
the change, Results says so.

**Consequence.**
- **Holds:** a fast-forward of the release branch `external-workflow-adoption`
  from 5f4ab78 to db33b7e is proposed, with the drafted 6.15.0 CHANGELOG
  bullet, as a diff for the human partner's approval. BACKLOG item 1 closes
  when they approve it.
- **Fails:** db33b7e does not reach the release branch as it stands. The
  hand-read informs a narrower wording (for example without "or screen"),
  which gets its own pre-registration and must pass both this scenario and
  the after-compaction scenario. If the pilot started the companion too,
  Results says so: the shipping head may share the over-trigger.
- **No reading:** the human partner's call.

**Hand-read.** Every counted session is read by hand.

Each session that did not start the companion is classified:
- (a) showed candidate outputs as text in chat;
- (b) asked the choice through `AskUserQuestion`; note whether text samples
  came before it;
- (c) never posed the output choice, and decided it in the design;
- (d) other, described.

Each such session also records whether it offered or mentioned a browser or
mockup without starting one.

Each session that started the companion records:
- what its first screen showed;
- whether it asked permission first;
- whether it read `visual-companion.md`.

Every session records the path it announced (spike, bounded,
architectural). The deterministic count governs the reading; the hand-read
explains it.

**Readouts, with no reading attached.** From `tally.py`:
- the one-sided 95% upper bound on the start rate;
- sessions where the record and the main transcript disagree on a start;
- sessions with an auto compaction (none expected);
- sessions that read `visual-companion.md`;
- sessions and calls using `AskUserQuestion`;
- sessions writing an `.html` file;
- sessions naming a `localhost` or `127.0.0.1` port;
- sessions whose composed final did not pass.

## Void Attempts

Fixed before the runs, per the evals void-attempt rule, as in the campaigns
before this one:

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

The pilot follows the same rules, and none of its attempts is counted. Every
void attempt is recorded here with its stderr.

## Mutation Checks

Each window has an epoch stamp, written immediately before launch:
- `logs/pilot-window-start.txt` for the pilot, checked against the control
  worktree before the pilot and after it;
- `logs/batch-window-start.txt` for the batch, checked against the treatment
  worktree before the batch, after the counted sessions, and after
  archiving.

Each check:
- `find` over the worktree outside `.git` reports no file newer than the
  stamp;
- the worktree's `HEAD` equals its pin;
- `git status --short` is empty.

## Limits

- **One shape of change with no page.** A command-line tool's text output.
  Back-end changes, configuration, and API changes that feed a page are not
  tested.
- **No compaction.** Sessions run at the default window. After a compaction,
  Claude Code re-attaches `SKILL.md` cut at 20000 characters. In the
  treatment the cut falls right after the label "**Per-question decision",
  so a compacted session keeps the new sentence and loses the per-question
  test, the place `SKILL.md` sends text content to the terminal. A compacted
  session may open the companion more often than this measures.
- **Power.** The table does not reliably separate a start rate near 10% from
  zero (see Decision Rules).
- **No counted control.** One pilot session at the shipping head. Whether the
  shipping head opens the companion on this change is not measured beyond
  it.
- **The operator always says yes.** A session that asks permission and then
  starts counts as started. A real human partner could decline the offer.
- **Scope.** One scenario, one model, one Claude Code version, one fixture.

## Files

- `manifest.tsv` and `manifest-pilot.tsv`, and `manifest-extend.tsv` if an
  extension runs.
- `launch-all.sh`, copied unchanged from the placement-trigger campaign.
- `logs/measure-launch.sh`, adapted from the placement-trigger campaign's:
  the evidence directory, and the control arm for the pilot.
- `archive-runs.sh`, adapted from the placement-trigger campaign's: the
  evidence directory, and both arms.
- `logs/`: one log per row with the pins, the command, and quorum's `trials:`
  output, plus the two window stamps and `launch-all.out`. Replacements and
  re-runs under the void rules are logged as `r<n>`.
- `runs/<arm>/<run-id>/`: the run archives, stripped per `../README.md`.
- `tally.py` and its output `tally.txt`: the decision rules over the archive.
- `handread.md`: the hand-reads named above.

## Results

Pending.
