# Ladder Router Brief b1 Re-measure (2026-09-30)

Pre-registered before the first session. The rule below was fixed and
committed before any run launched; results are appended under Results.

## Question

In the adoption-remediation Phase 3 campaign, router brief
`brainstorming-router-escalates-b1-userid-param` passed 1 of 3 on the
bootstrap-ladder tree. All three sessions invoked brainstorming; the two
failures classified the task bounded and wrote no spec. The only prior cell
for this brief is the interlock campaign's full arm at 3/3, also n=3. This
campaign asks whether the ladder lowers b1's pass rate or whether the Phase 3
miss was a small-sample draw.

Suspected mechanism, to be read from the transcripts, not scored: ladder rung
1 names "an interface others call (a route, a field name, a signature)", so
"Add a userId parameter to the login function" may be handled as a rung-1
confirm followed by a bounded classification.

## Arms

- **control:** hyperpowers `main` at 3bdb5b2, worktree
  `.worktrees/ladder-b1-control`.
- **treatment:** `external-workflow-adoption` at 10b1773 (after the A8-sentence
  and A10 reverts; skills tree e707321), worktree
  `.worktrees/ladder-b1-treatment`.

What differs for this brief: the `using-hyperpowers` body (the ladder), and
one bullet in brainstorming's spec-writing section (A6's `Assumption:` form),
which acts only after routing. The rest of the skills diff is SDD, code-review
and writing-plans prose that a routing session does not load, plus a YAML
quoting change to `optimizing-performance`'s description. Checked before
launch: each arm's `hooks/session-start`, fed a `startup` payload, injects a
context byte-identical to the other's once each arm's own `using-hyperpowers`
body is masked; the hook's other changes act on compaction or on control
bytes this content does not carry.

## Pins

In `manifest.tsv`: harness d657476 (evals HEAD at launch; evidence commits may
follow, harness paths may not), control 3bdb5b2, treatment 10b1773, model
`claude-opus-5` via `claude-auto`. Grader: Gauntlet `claude-opus-5-5`.
Claude Code 2.1.284. Budget `default`: `SLASH_COMMAND_TOOL_CHAR_BUDGET` and
`INTERLOCK_PROBE_TRACE` unset. Scenario unchanged.

## Size

8 manifest rows, each one `quorum run --repeat 5` process: 4 per arm, 20
sessions per arm, 40 in all, 8 concurrent.

## Decision Rule

A session passes when its composed final verdict is pass. The bar is
treatment at least 14 of 20. A regression is treatment below control with a
one-sided Fisher exact p < 0.05.

| Result | Reading |
|---|---|
| treatment >= 14/20 and no regression | b1 clears; the Phase 3 miss was a small-sample draw |
| regression | ladder rung 1 is revised or the ladder reverts; the human partner's call |
| both arms < 14/20, no regression | a brief or router issue, not the ladder's |
| treatment < 14/20, control >= 14/20, no regression | extend both arms to n=40 once, then the human partner's call |

Detectability: with control at 20/20 a regression needs treatment at 15 or
below; at 18/20, 12 or below; at 16/20, 10 or below. Differences of a few
sessions read as not separated, not as equal.

## Void Attempts

Fixed before the runs, per the evals void-attempt rule:

- **Grader exit** (`verdict.json` status `investigate`, "gauntlet exited
  ... without writing a result", transport error in
  `gauntlet-agent/gauntlet-stderr.log`): replaced, at most three further
  attempts per arm.
- **Harness setup** (null `gauntlet`, "quorum error (setup): setup.sh failed",
  the sandbox EPERM signature): relaunched; does not consume the cap.
- **A real indeterminate** (the coding agent failed, stalled, or produced no
  usable transcript): re-run once; indeterminate twice stays indeterminate and
  counts as not passing.

Every void attempt is recorded here with its stderr.

## Files

- `manifest.tsv`, `launch-all.sh` (copied unchanged from
  `../2026-09-23-adoption-remediation/`), `logs/measure-launch.sh` (adapted:
  evidence directory and arm roots only).
- `logs/`: one log per manifest row with the pins, the command, and quorum's
  `trials:` output. Replacements and re-runs under the void rule are logged
  the same way as `r<n>`; `logs/void-setup/` holds the setup-void launch.
- `runs/<arm>/<run-id>/`: the run archives, stripped per `../README.md` by
  `archive-runs.sh`.
- `superseded.txt`: each real indeterminate and the re-run that replaced it,
  written before the re-run launched.
- `tally.py` and its output `tally.txt`: the decision rule over the archive.
- `cues.py` and its output `cues.txt`: a diagnostic, not pre-registered.

## Results

**Reading: regression.** Control passed 16 of 20 and treatment 6 of 20,
against a bar of 14; one-sided Fisher exact p = 0.0018. Under the rule above,
ladder rung 1 is revised or the ladder reverts, and which is the human
partner's call. `tally.txt` is `tally.py` run over the archive.

| Counted sessions | control | treatment |
|---|---|---|
| pass | 16 | 6 |
| fail | 4 | 12 |
| indeterminate after its one re-run (counts as not passing) | 0 | 2 |
| total | 20 | 20 |

Every counted fail in both arms also fails the deterministic post-check
(`find` for a spec under `docs/*/specs/` exits non-zero), so the direction
does not rest on the grader: treatment wrote a spec in 8 counted sessions,
control in 16. If both treatment sessions that stayed indeterminate had
counted as passes, treatment would be 8 of 20 and p = 0.0112, still a
regression.

### Sessions

- Main batch: the 8 manifest rows, 40 sessions, 8 concurrent, 17:26:24Z to
  18:35:01Z.
- Follow-ups under the void rule: 8 launched together at 18:36:45Z,
  treatment r5 at 18:42:18Z when a slot freed, then control r5 at 18:55:01Z
  and control r6 at 19:08:08Z, each alone. The last finished at 19:20:21Z.
- Claude Code 2.1.284 throughout; every row log records the pins it checked.

### Void Attempts

- **Harness setup: 40, not counted, cap not consumed.** The first launch, at
  17:24:17Z, ran inside the controller's sandbox. Every session failed in
  setup before the Gauntlet started:

  ```
  git init -b main failed (exit 128)
  fatal: cannot copy '/opt/homebrew/opt/git/share/git-core/templates/hooks/commit-msg.sample' to '…/coding-agent-workdir/.git/hooks/commit-msg.sample': Operation not permitted
  ```

  All eight rows were relaunched outside the sandbox at 17:26:18Z. The failed
  launch's logs are in `logs/void-setup/`.
- **Grader exit: control 2 of its cap of 3, treatment 0.** Both carry the same
  line in `gauntlet-agent/gauntlet-stderr.log`:

  ```
  {"error":{"message":"The socket connection was closed unexpectedly. For more information, pass `verbose: true` in the second argument to fetch()"}}
  ```

  - `…174918Z-174d`, control p4 trial 4, replaced by control r4.
  - `…185502Z-2994`, control r5, the re-run owed to r4's indeterminate,
    replaced by control r6. It coincided with a network disconnect on the
    host.

  Both are archived. Neither has a `result.json`, because the grader exited
  before writing one; they are the post-check's only exceptions.
- **Real indeterminates: 9, each re-run once.** Every one was a
  Gauntlet-Agent `investigate` on a session that completed. The agent opened
  bounded, upgraded to architectural after the brief's scripted
  clarification, and wrote a spec; the grader could not settle whether the
  late upgrade met the ACs. The two re-runs that stayed indeterminate have
  the same shape.

  | Original | Slot | Re-run | Result |
  |---|---|---|---|
  | `…180728Z-4d47` | control p2 trial 4 | control r1, `…183645Z-a89f` | pass |
  | `…175559Z-c345` | control p3 trial 4 | control r2, `…183645Z-a179` | pass |
  | `…181338Z-ecb3` | control p3 trial 5 | control r3, `…183645Z-d20c` | pass |
  | `…183645Z-8b8c` | control r4 | control r6, `…190808Z-97b0` (r5 void) | pass |
  | `…172624Z-8d07` | treatment p1 trial 1 | treatment r1, `…183645Z-c0d1` | indeterminate |
  | `…174439Z-9e38` | treatment p2 trial 3 | treatment r2, `…183645Z-4504` | indeterminate |
  | `…180204Z-397b` | treatment p2 trial 5 | treatment r3, `…183646Z-fa2c` | pass |
  | `…172624Z-896c` | treatment p4 trial 1 | treatment r4, `…183646Z-dc5c` | fail |
  | `…174533Z-1ef4` | treatment p4 trial 3 | treatment r5, `…184218Z-e034` | fail |

### Diagnostics

Not pre-registered and not scored. Read from the 40 manifest-row sessions
after the tally; none of it bears on the reading.

- **First classification**, hand-read from each session's first message that
  says "bounded" or "architectural". Treatment opened bounded in 20 of 20,
  each citing the entry point ("one function, one caller, one file"). Control
  opened architectural or explicitly not bounded in 9 (`b648`, `6643`,
  `9663`, `461c`, `13ad`, `3e0c`, `ab59`, `7f3e`, `0669`), plainly bounded in
  8 (`59f1`, `4d47`, `2759`, `d167`, `c345`, `ecb3`, `6148`, `5d9b`), and
  hedged in 3: `3cc7` and `174d` called the edit bounded and then flagged
  that the goal names tracking the repo lacks, and `b2b9` laid out both
  paths and recommended the architectural one.
- **Cues in the text up to and including that message** (`cues.txt`):

  | Cue | control | treatment |
  |---|---|---|
  | "outcome" | 7/20 | 0/20 |
  | new structure ("new module", "subsystem", "doesn't have") | 15/20 | 5/20 |
  | interface or signature | 18/20 | 20/20 |
  | rung or ladder | 0/20 | 2/20 |

- **The suspected mechanism does not fit.** The Question above suspected that
  rung 1's "an interface others call" would turn the request into a confirm
  followed by a bounded classification. The interface cue is at ceiling in
  both arms, and only two treatment sessions name the ladder. What separates
  the arms is whether the agent weighs the request's stated outcome before
  classifying: "so we can track who logged in" names identity and tracking
  this repository does not have. Control mostly does. Treatment sizes the
  request by its edit, which is the thought brainstorming's own red flag
  names: "The code I'd touch is right here, so it's bounded". One treatment
  session, `eca4`, says it outright: "I ran the ladder on this: it changes
  `login`'s signature, and a real design choice comes with it — so
  brainstorming, on the **bounded** path". A reading consistent with this is
  that the ladder sorts the request by its edit before brainstorming loads,
  and the sort carries into brainstorming's classification. That is an
  interpretation of transcripts, not a measurement, and the cue patterns are
  crude.
