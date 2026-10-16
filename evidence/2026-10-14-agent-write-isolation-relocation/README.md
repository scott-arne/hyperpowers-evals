# 2026-10-14 agent write isolation by relocation

Run artifacts the plan `docs/hyperpowers/plans/2026-10-14-agent-write-isolation-relocation.md`
(hyperpowers) and its evidence note cite.

## Replay

`replay/` holds the counterfactual replay of the retained corpus the spec's
first Assumption asks for (plan Task 11; spec, Verification item 7). For every
eligible recorded run, the instrument clones the recorded workspace into two
isolated arms and re-runs the scenario's current `pre()`/`post()` in both — Arm
L under the legacy post-check environment, Arm N under the new allowlisted one
— then canonicalizes the emitted records and compares them. A synthetic fixture
is the same comparison over a counterfactual workspace the repository ships,
for a tool or a scenario the corpus cannot cover.

### The command of record

    bash evidence/2026-10-14-agent-write-isolation-relocation/replay/run-replay.sh

It resolves the corpus itself: `results/` is gitignored, so a feature worktree
has none, and the script reaches the primary checkout's `results/` through
`git rev-parse --git-common-dir`. It refuses to run if the sentinel run is
missing. Everything it does to the corpus is read-only: the instrument hashes
each record and workspace before the first clone and re-checks after every
step, and stops the sweep if either changed. Nothing changed in this run.

Run on 2026-10-16, 15:27:03 to 15:36:30 -0700 (9 min 27 s), host load average
between 51 and 64 throughout, with no live evals and nothing else heavy on the
host. Corpus: `/Users/johnss51/Development/agents/hyperpowers/evals/results`.
The sweep immediately before it (14:39:49 to 15:11:32, 31 min 43 s on a cold
page cache) produced the same counts, the same uncovered tool and the same
refusal; it is not retained because two of its fixture files were reformatted
afterwards for `biome ci`, which no check reads.

**It must be run outside this host's command sandbox.** One recorded
workspace (`codex-gate-converges-on-reraise-claude-bedrock-20260701T022647Z-fa24`)
holds `home/.aws/cli/cache` as a symlink into the operator's `~/.aws`, which
the sandbox denies reading. The instrument has to stat that target to judge the
reference, and the sandbox's `EPERM` is — correctly — an instrument failure
rather than a result, so a sandboxed sweep stops there with 38 runs unreplayed.
The first attempt (13:30) did exactly that; the run of record was taken outside
the sandbox.

### The result

    replayable 57 of eligible 61, floor 41
    equal: 67  diverged: 0  degraded-archive: 4  clone-refused: 1
    uncovered tools: go
    migrated scenarios not covered: none
    replay exit: 1

The full table is `replay/replay.md` (one row per run: layout, record counts,
status, external references, pre divergences, unmatched history); the machine
form, including both arms' raw and canonical records, is `replay/replay.json`;
the console output is `replay/stdout.txt`.

The exit is 1 for one reason: `go` is not installed on this host, so no run and
no fixture can exercise it. See "The one uncovered tool" below. Every other
class the instrument reports is resolved.

### The floor

- `scenarios/` holds 98 scenarios. 37 have no run anywhere in the corpus, which
  is the only ineligibility reason recorded — no run was demoted for a
  setup-stage verdict, a missing post record or a stripped workspace. That
  leaves **61 eligible**, one run each (the newest replayable run of that
  scenario).
- The predeclared floor is two thirds of the eligible set: ceil(61 x 2/3) =
  **41**.
- 61 eligible, minus 1 clone refusal, minus 3 corpus runs demoted to
  `degraded-archive`, leaves **57 replayable**. 57 >= 41, so the floor is met
  with 16 runs to spare.
- The control-arm vacuity guard demoted nothing: no result's `degradedCheck` is
  the guard's note ("the post phase emitted no usable record"), and all three
  corpus demotions are the anti-vacuity prerequisite's other rule — a recorded
  passing post check the control arm does not reproduce. The floor's base is
  therefore what the eligibility pass produced, not something the guard moved.
- The 11 synthetic fixtures do not count toward the floor (a counterfactual is
  not a replay of retained evidence); they count toward tool and migrated-
  scenario coverage, and `coverage()` requires them to be `equal` too.

### Divergences

**None.** Zero `diverged` results across 60 corpus runs and 11 fixtures: no
check the corpus or the fixtures hold behaved differently under the new
environment, in either direction. There was no spec-level finding to surface,
so `src/checks/env-allowlist.ts` is untouched, and no check turned out to
depend on the operator's home, so `scenarios/` is untouched.

The audit found nothing either: a pointer from one arm into the retained
evidence or into the other arm stops the sweep as an instrument failure, and
the sweep ran to completion.

### Clone refusal (1)

| run | message |
| --- | --- |
| `codex-gate-converges-on-reraise-claude-bedrock-20260701T022647Z-fa24` | `home/.aws/cli/cache leads to a directory outside the run: /Users/johnss51/.aws/cli/cache` |

A Bedrock run's throwaway home carries two symlinks into the operator's AWS
configuration (`home/.aws/cli/cache`, `home/.aws/sso/cache`). The clone reports
a symlink that leaves the workspace rather than re-aiming it, and a reference
that leads to a **directory** is refused: both arms would otherwise read the
same live directory outside the run. The run is named and the sweep goes on; it
leaves the replayable set, and the floor is measured against the eligible set,
so the refusal costs coverage rather than hiding it.

### Degraded archives (4)

| result | the check that could not be reproduced |
| --- | --- |
| `brainstorming-asks-tooling-question-claude-auto-20260909T183358Z-b38f` | `grep -qE "^task kind=(spec-review\|document-review) " "$QUORUM_AGENT_CONFIG_DIR/plugins/cache/openai-codex/codex/stub/scripts/calls.log"` |
| `codex-gate-re-review-focus-is-fixed-claude-auto-20260908T180216Z-fa95` | `node "$(dirname "$QUORUM_AGENT_CONFIG_DIR")/.focus-assert/focus-assert.mjs" launched` |
| `codex-gate-stale-broker-attributed-claude-vertex-20260723T163110Z-3897` | `find "$QUORUM_AGENT_CONFIG_DIR/plugins/data/codex-openai-codex/state" -type f -name "broker.json" \| grep -q .` |
| `tool-go` (synthetic) | `go version` |

The three corpus demotions have one cause: `scripts/strip-runs` deletes
`home/.claude/plugins/{cache,data,marketplaces}` from a completed run, and each
of those checks reads something under them — the Codex stub's `calls.log`, the
`.focus-assert` manifest's `pluginRoot`/`launchDir` (both inside the stub
install), and the stale-broker fixture's `state/broker.json`. Verified by hand
in each archive: only `installed_plugins.json` and `known_marketplaces.json`
survive under `home/.claude/plugins/`. The archive cannot answer the question,
so the instrument refuses to call the comparison a pass; this is the
prerequisite working, not a regression. The counterfactual fixtures added for
the degraded pre shapes (below) read the same stripped directories, and
one of them — the `broker.json` `find` — is literally the shape of the third
post check here.

`tool-go` is the fixture for the uncovered `go`, which this host cannot run.

### Pre divergences from history

A pre check that passed in the recorded run and fails when the same check is
re-run against the retained workspace. The pre phase is not what the
counterfactual compares — both arms run it and the comparison is over the
records — but a divergence here says something about the archive, so every
distinct shape is classified once. 20 distinct shapes over 30 occurrences:

| shape | runs | class | why |
| --- | --- | --- | --- |
| `git-clean []` | 4 | state-dependent | the recorded pre ran on the fixture before the session; the retained tree is what the agent left |
| `git-branch ["main"]` | 2 | state-dependent | the session switched branches (`config-flags`, `fix/limiter-off-by-one`), which is the behaviour under test |
| `not file-exists ["docs/hyperpowers/plans"]` | 3 | state-dependent | the agent wrote the plan the scenario asked for (`docs/hyperpowers/plans/2026-10-02-deploys-page.md`) |
| `file-exists ["greet.js"]` | 2 | state-dependent | the session's own commit deleted it ("Consolidate greet helpers into src/utils.js") |
| `file-exists ["export.js"]` | 1 | state-dependent | the agent removed the export feature, which is the scenario |
| `file-contains ["schema.sql","notes"]` | 1 | state-dependent | the column was dropped |
| `file-contains ["index.html","<h1>Reports</h1>"]` | 1 | state-dependent | the heading is now `<h1>Quarterly Reports</h1>` |
| `file-contains ["index.html","Export CSV"]` | 1 | state-dependent | the export control was removed |
| `file-contains ["list.js","PAGE_SIZE = 10"]` | 1 | state-dependent | now `PAGE_SIZE = 25` |
| `file-contains ["config.js","SESSION_TIMEOUT_MINUTES: 30"]` | 1 | state-dependent | the timeout was changed |
| `file-contains ["src/textkit/chunking.py","chunk_size - 1"]` | 1 | state-dependent | the off-by-one was fixed |
| `not file-contains ["index.html","[Cc]heckbox"]` | 1 | state-dependent | the agent added the checkbox |
| `not command-succeeds ["./.venv/bin/pytest -q"]` | 1 | state-dependent | the suite was red at pre and the session made it green |
| `not command-succeeds ["./.venv/bin/pytest -q tests/test_slugify.py"]` | 1 | state-dependent | same |
| `not command-succeeds ["node -e ... finalPrice(100,\"BOGUS\") ..."]` | 1 | state-dependent | same: the planted bug was fixed |
| `command-succeeds ["G=... /codex-review/active-gate; grep -q "\"round\":1" ... ]` | 1 | state-dependent | the gate dir survives; the session advanced it to `{"round":2,...}` |
| `command-succeeds ["STUB=$(node -e ... installed_plugins.json ...); node "$STUB/scripts/codex-companion.mjs" setup --json"]` | 4 | **degraded** | `installPath` names the stripped `plugins/cache/.../stub` |
| `command-succeeds ["node "$QUORUM_AGENT_CONFIG_DIR/plugins/cache/openai-codex/codex/stub/scripts/codex-companion.mjs" setup --json"]` | 1 | **degraded** | the stub script is under the stripped `plugins/cache` |
| `command-succeeds ["test -d "$QUORUM_AGENT_CONFIG_DIR/plugins/data/codex-openai-codex/state""]` | 1 | **degraded** | the state dir is under the stripped `plugins/data` |
| `command-succeeds ["find "$QUORUM_AGENT_CONFIG_DIR/plugins/data/codex-openai-codex/state" -type f -name "broker.json" \| grep -q ."]` | 1 | **degraded** | same |

Each of the four degraded shapes gets a synthetic counterfactual below. The
sixteen state-dependent shapes get none: the artifact is not missing, the
recorded state has simply moved on, and a fixture would assert about the
fixture rather than about the archive.

### Unmatched history

Five runs carry a recorded passing post check the scenario's current text no
longer asks for. Each is a line that changed after the run, two of them in
this branch's own migration:

| run | the recorded check the current text does not hold |
| --- | --- |
| `codex-approach-gate-fires-on-architecture` | the pre-migration `$QUORUM_RUN_DIR/home/...` grep, now `$QUORUM_AGENT_HOME/...` |
| `tdd-runs-the-project-suite` | the pre-migration `args= home=$QUORUM_RUN_DIR/home` history line |
| `brainstorming-asks-tooling-question` | an older spec-scan `awk`/`grep` one-liner |
| `brainstorming-bounded-companion-closed-cli-output` | a `not check-transcript tool-arg-match ... start-server[.]sh` |
| `worktree-creation-under-pressure` | a `not check-transcript tool-arg-match ... git worktree add` |

Unmatched history is reported, never fatal: the historical occurrence consumes
no line of the current text, so it cannot mask a check the control arm failed
to reproduce.

### Decisions taken on this sweep

In the plan's resolution order.

1. **A diverged run.** None, so nothing to surface and no allowlist or scenario
   change. (`src/checks/env-allowlist.ts` and `scenarios/` are untouched by
   Task 11.)

2. **Uncovered tools.** The first sweep left `npx`, `go` and `python3`
   unexercised: the scenarios that invoke them (`sdd-svelte-todo*`,
   `sdd-go-fractals-*`, `perf-optimize-measures-and-reverts-unpaid`) have no
   run in the corpus. Three one-line fixtures were added and appended to the
   command of record:

   - `test/fixtures/replay-synthetic/tool-npx` — `npx --no-install --version`.
     `--no-install` keeps the counterfactual offline; the shipped use is
     `npx --no-install playwright test`.
   - `test/fixtures/replay-synthetic/tool-python3` —
     `python3 -c "import sys; sys.exit(0)"`.
   - `test/fixtures/replay-synthetic/tool-go` — `go version`. See below.

   `pytest` needed no fixture: the shipped `./.venv/bin/pytest` of
   `verification-phantom-completion` and `receiving-code-review-pushback` is
   counted by its basename, and both runs replayed.

3. **Migrated scenarios not covered by a corpus run.** Two of the four were
   still uncovered after the tool fixtures: `codex-gate-stale-broker-attributed`
   (its one corpus run degrades, see above) and
   `codex-plan-gate-algorithm-locked-after-round1` (no run at all). Each gets a
   fixture carrying that scenario's migrated line verbatim, with a `scenario`
   file so it stands in for the scenario by name:

   - `test/fixtures/replay-synthetic/stale-broker-ungated-grep` — the
     `"class":"degraded-gate" ... "status":"stale-broker"` grep under
     `$QUORUM_AGENT_HOME/.cache/hyperpowers/ungated`.
   - `test/fixtures/replay-synthetic/plan-gate-locked-grep` — the
     `Algorithm locked:` grep under
     `$QUORUM_AGENT_HOME/.cache/hyperpowers/codex-review`.

   The other two (`codex-approach-gate-fires-on-architecture`,
   `tdd-runs-the-project-suite`) are covered twice over: by their corpus runs,
   both `equal`, and by the fixtures Task 10 shipped.

4. **Pre divergences from history.** Classified above. The four degraded shapes
   get one counterfactual each, every one running the recorded shape verbatim:

   - `test/fixtures/replay-synthetic/codex-stub-installpath`
   - `test/fixtures/replay-synthetic/codex-stub-companion`
   - `test/fixtures/replay-synthetic/codex-broker-state-dir`
   - `test/fixtures/replay-synthetic/codex-broker-state-file`

   Each ships its seed under `workspace-home/seed/` and copies it into place in
   the post phase (`mkdir -p "$QUORUM_AGENT_CONFIG_DIR" && cp -R
   "$QUORUM_AGENT_HOME/seed/plugins" "$QUORUM_AGENT_CONFIG_DIR/plugins"`)
   before running the shape. The seed cannot be shipped where the shape reads
   it: the agent config dir is `<arm>/home/.claude`, and `.gitignore` excludes
   `.claude/` repo-wide, so files seeded there would never commit and the
   fixture would be broken for anyone else. The two stub fixtures carry an
   eight-line `codex-companion.mjs` that answers `setup --json` and nothing
   else — the counterfactual has to answer the command the shape runs, not
   stand in for the whole stub.

5. **Degraded-archive runs.** Listed above with their checks. One of them is a
   migrated scenario, which item 3 covers with a fixture; the other two need
   nothing further.

### The one uncovered tool

`go` is in the instrument's inventory because `sdd-go-fractals-opus48` and
`sdd-go-fractals-gpt55` run `go test ./...` in their post phase. Neither
scenario has ever been run on this host and **no Go toolchain is installed
here** (nothing on `PATH`, no `/usr/local/go`, no Homebrew cellar, no
micromamba env). The fixture `tool-go` therefore degrades: `go version` fails
identically in both arms (`go: command not found`), so the two arms compare
equal and the instrument demotes the fixture rather than let a failed
counterfactual clear a tool off the list. `go` stays uncovered, which is the
whole of why the sweep exits 1.

This is a gap in the evidence, not a divergence: nothing suggests `go` behaves
differently under the new environment, and nothing here measured it. Closing it
needs a toolchain on the host — install Go and re-run the command of record
unchanged; `tool-go` is already wired into it, and the sweep then exits 0 if
nothing else regressed. The alternative, a stub named `go` on `PATH`, would
clear the inventory while measuring nothing about Go, so it was not taken.

For the record, the environment-sensitive part of a real `go test` is exactly
the part this replay cannot see: under the new inner environment `HOME` is the
arm's agent home, so `GOCACHE`, `GOMODCACHE` and `GOPATH` resolve under it, and
a module cache seeded in the operator's home would be invisible.

### Files

- `replay/run-replay.sh` — the command of record. Re-running it rewrites
  `replay.json`, `replay.md` and `stdout.txt` in place.
- `replay/replay.md` — the per-run table.
- `replay/replay.json` — the machine form: both arms' raw and canonical
  records, exit codes, arm roots, coverage, ineligible and refused lists.
- `replay/stdout.txt` — the console summary, with the recorded exit appended.
