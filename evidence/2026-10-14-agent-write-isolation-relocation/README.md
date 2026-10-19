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

Run on 2026-10-16, 17:22:38 to 17:38:08 -0700 (15 min 30 s), host load average
between 38 and 48 throughout, with no live evals and nothing else heavy on the
host. Corpus: `/Users/johnss51/Development/agents/hyperpowers/evals/results`.

Two earlier sweeps the same afternoon (14:39:49 and 15:27:03) produced this
same coverage line — `replayable 57 of eligible 61, floor 41` — but exited 1,
because `go` was not installed on the host and the `tool-go` fixture could not
run; their per-status line reads `equal: 67  diverged: 0  degraded-archive: 4
clone-refused: 1`, the one fixture apart. See "The `go` re-record" below.
Comparing the exit-1 record with this one, result by result, `tool-go` is the
only row that differs — status, records, exit codes, pre divergences, unmatched
history, external references and tool lists are identical for all 70 others, as
are the eligibility, refusal and layout lists.

**It must be run outside this host's command sandbox.** One recorded
workspace (`codex-gate-converges-on-reraise-claude-bedrock-20260701T022647Z-fa24`)
holds `home/.aws/cli/cache` as a symlink into the operator's `~/.aws`, which
the sandbox denies reading. The instrument has to stat that target to judge the
reference, and the sandbox's `EPERM` is — correctly — an instrument failure
rather than a result, so a sandboxed sweep stops there with 38 runs unreplayed.
The first attempt (13:30) did exactly that; every sweep since, this record
included, was run outside the sandbox.

### The result

    replayable 57 of eligible 61, floor 41
    equal: 68  diverged: 0  degraded-archive: 3  clone-refused: 1
    uncovered tools: none
    migrated scenarios not covered: none
    replay exit: 0

The full table is `replay/replay.md` (one row per run: layout, record counts,
status, external references, pre divergences, unmatched history); the machine
form, including both arms' raw and canonical records, is `replay/replay.json`;
the console output is `replay/stdout.txt`.

The exit is 0: the floor is met, every tool in the instrument's inventory and
every migrated scenario is covered, and nothing diverged. The three
`degraded-archive` results are runs the archive can no longer answer for, which
`coverage()` takes out of the counting sets rather than counting as passes.

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
  scenario coverage. All 11 measured `equal` in this run, with every post
  record passing. Be precise about what that is worth: `coverage()` fails the
  exit on a fixture that *diverges*, but a fixture that degrades simply drops
  out of `covering`, and then only reaches the exit if it was the last thing
  covering a tool (`uncoveredTools`) or a migrated scenario
  (`migratedUncovered`) — which is how `tool-go` held the exit at 1 earlier
  today. The four degraded-pre-shape fixtures below satisfy neither: their
  tools are covered by corpus runs anyway and their names are not migrated
  scenarios, so if one of them silently degraded in a later sweep the exit
  would not notice. Reading their rows in `replay.md` is what catches that.

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

### Degraded archives (3)

| result | the check the control arm could not reproduce |
| --- | --- |
| `brainstorming-asks-tooling-question-claude-auto-20260909T183358Z-b38f` | `grep -qE "^task kind=(spec-review\|document-review) " "$QUORUM_AGENT_CONFIG_DIR/plugins/cache/openai-codex/codex/stub/scripts/calls.log"` |
| `codex-gate-re-review-focus-is-fixed-claude-auto-20260908T180216Z-fa95` | `node "$(dirname "$QUORUM_AGENT_CONFIG_DIR")/.focus-assert/focus-assert.mjs" launched` |
| `codex-gate-stale-broker-attributed-claude-vertex-20260723T163110Z-3897` | `find "$QUORUM_AGENT_CONFIG_DIR/plugins/data/codex-openai-codex/state" -type f -name "broker.json" \| grep -q .` |

All three have one cause: `scripts/strip-runs` deletes
`home/.claude/plugins/{cache,data,marketplaces}` from a completed run, and each
of those checks reads something under them — the Codex stub's `calls.log`, the
`.launches` directory the `.focus-assert` manifest names in `launchDir` (inside
the stub install; `launched` reads that and nothing else, and returns no
launches when it is gone), and the stale-broker fixture's `state/broker.json`.
Verified by hand in each archive: only `installed_plugins.json` and
`known_marketplaces.json` survive under `home/.claude/plugins/`.

Worth recording from that manifest, though it changes nothing here: its
`pluginRoot` and `ledgerPaths` are host-absolute paths frozen into a recorded
JSON file, and a path inside a copied file is invisible to the clone's
external-reference machinery, which reads symlinks and git pointers. An arm
whose check followed such a path would read outside the run with nothing
reported. No shipped `scenarios/*/checks.sh` carries a host-absolute path today
(`grep -rl "/Users/" scenarios/*/checks.sh` is empty), and the one manifest path
this sweep reaches, `launchDir`, is gone from the archive, so no result here is
affected. The archive cannot answer the question,
so the instrument refuses to call the comparison a pass; this is the
prerequisite working, not a regression. The counterfactual fixtures added for
the degraded pre shapes (below) read the same stripped directories, and
one of them — the `broker.json` `find` — is literally the shape of the third
post check here.

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
   - `test/fixtures/replay-synthetic/tool-go` — `go version`. It degraded on
     the first records, for want of a toolchain; see "The `go` re-record".

   `pytest` needed no fixture: the shipped `./.venv/bin/pytest` of
   `verification-phantom-completion` and `receiving-code-review-pushback` is
   counted by its basename, and both runs replayed.

   One quirk of the inventory to read past: its leader scan treats a redirect
   target as a new command, so `replay.json`'s `tools` arrays also carry
   `/dev/null` (20 results, the two `codex-stub-*` fixtures among them), `1`
   (the three `writing-plans-reuses-component-library*` runs) and `;` (one).
   These can only add a spurious name to the exercised set, never remove a
   required one, so no coverage verdict depends on them. Fixing it means
   changing `src/cli/replay-post-checks.ts`, which Task 11 does not touch; it
   is left to the final review.

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

### The `go` re-record

`go` is in the instrument's inventory because `sdd-go-fractals-opus48` and
`sdd-go-fractals-gpt55` run `go test ./...` in their post phase. Neither
scenario has a run in the corpus, so only a fixture can exercise it — and when
the first two sweeps ran (2026-10-16, 14:39 and 15:27) no Go toolchain was
installed on this host. `tool-go` degraded there: `go version` failed
identically in both arms, the instrument declined to let a failed
counterfactual clear a tool off the list, and the sweep exited 1 with
`uncovered tools: go` as its only unmet condition. That history is kept
deliberately — it is what the evidence said before the host changed, and the
exit-1 artifacts themselves are the previous commit's (`c7728718a`), which this
directory's files replace. A stub named `go` on `PATH` would have cleared the
inventory while measuring nothing, and was not taken.

Go 1.27.2 (`/opt/homebrew/bin/go`, `go1.27.2 darwin/arm64`) was installed on the
host on 2026-10-16, and the command of record was re-run unchanged at 17:22:38.
`tool-go` passes in both arms, `uncovered tools` is empty and the recorded exit
is 0. Nothing in the instrument, the scenarios or the fixtures changed between
the two runs, and `tool-go` is the only result that differs.

A fixture proves the tool runs under the new environment, which is what the
inventory asks. It does not reach what a real `go test ./...` would exercise:
under the new inner environment `HOME` is the arm's agent home, so `GOCACHE`,
`GOMODCACHE` and `GOPATH` resolve under it, and a module cache seeded in the
operator's home would be invisible. Measuring that needs a `sdd-go-fractals-*`
run in the corpus, which there is not.

### Files

- `replay/run-replay.sh` — the command of record. Re-running it rewrites
  `replay.json`, `replay.md` and `stdout.txt` in place.
- `replay/replay.md` — the per-run table.
- `replay/replay.json` — the machine form: both arms' raw and canonical
  records, exit codes, arm roots, coverage, ineligible and refused lists.
- `replay/stdout.txt` — the console summary, with the recorded exit appended.

## Smokes

`smokes/` holds the live smoke runs of the relocated layout (plan Task 14): the
scenario `scenarios/00-quorum-smoke-hello-world` driven for real, once per
Coding-Agent, to validate the spec's second Assumption — no agent CLI inspects
the absolute workdir path beyond Antigravity's hidden-component rule — and the
inner-home overlay's live behaviour.

### The command of record

    SUPERPOWERS_ROOT=/Users/johnss51/Development/agents/hyperpowers bash evidence/2026-10-14-agent-write-isolation-relocation/smokes/run-smoke.sh <agent>

The variable is set for that command only: it is not exported in the
maintainer's shell and quorum does not discover it. Run from the worktree, one
agent at a time. Each pipeline's exit status is captured on the line after it,
which is why the script is bash: the interactive shell here is zsh and has no
`PIPESTATUS`.

One deviation from the plan's script text: the script reads the run by its
directory (`quorum show "results/$run_id"`) because `quorum show` resolves
directories, verdict files, batches and scenario prefixes, not run ids
(`src/cli/resolve-target.ts:49-95`) — a bare run id exits 1 with
`could not resolve target`, on a pre-relocation run in the primary checkout
just as here, so this is the reader's long-standing contract and not something
the relocation changed.

Both smokes must run outside this host's command sandbox. A sandboxed attempt
dies in `setup.sh` before the agent ever starts: `git init -b main` exits 128
with `fatal: cannot copy '/opt/homebrew/opt/git/share/git-core/templates/hooks/commit-msg.sample'
to '…/coding-agent-workdir/.git/hooks/commit-msg.sample': Operation not
permitted`. That is the sandbox's write policy over this worktree's `results/`,
not the relocation; the first claude-auto attempt
(`…-20261017T180310Z-5956`) is that artifact and is not recorded here.

### The results

Both run on 2026-10-17 against evals `c73ba3baf` (clean) and the Gauntlet fork
at `a35607e` (dirty).

| agent | run id | run exit | show exit | final | wall |
| --- | --- | --- | --- | --- | --- |
| claude-auto | `00-quorum-smoke-hello-world-claude-auto-20261017T180750Z-e658` | 0 | 0 | pass | 1 m 37 s |
| codex | `00-quorum-smoke-hello-world-codex-20261017T181122Z-da93` | 0 | 0 | pass | 2 m 17 s |

Each satisfies every condition of the plan's predeclared acceptance: `run exit`
in {0, 1}; `show exit` 0; a `final` that is not `indeterminate` with an
`error.stage` of `setup` or `qa-agent-misconfigured` (both are `pass`, with
`error: null`); `verdict.json` at `results/<run>/`; the workspace at
`results/workspaces/<run>/` carrying the agent's transcript under its `home/`
(claude-auto: `home/.claude/projects/…/*.jsonl`; codex:
`home/.codex/sessions/2026/10/17/rollout-*.jsonl`); and a `trajectory.json`
with at least one tool call (claude-auto 1, codex 2 — a `Bash` write of
`hello.txt` in both). Both Gauntlet-Agent grades and both pairs of post-checks
passed on their own terms, which is more than the acceptance asks.

Read together with the record listings, that is the Assumption holding live for
two of the three CLIs: neither agent failed or showed any path-related trouble
with its workdir under `results/workspaces/`, and each wrote its session log
into the relocated inner home rather than the record tree. No pre-relocation
control was run alongside, so this says the relocated layout works for both,
not that their behaviour is unchanged from the old one.

### Antigravity: not run

Blocked on this host by the human partner's decision, and recorded rather than
worked around: the `agy` binary is absent from `PATH` and the usual install
locations, and `~/.gemini/oauth_creds.json` — the live token the agent reads at
runtime — does not exist. The only Antigravity run on this host dates from
2026-06-01. The spec's Antigravity hidden-component assumption therefore stays
unvalidated live; `smokes/antigravity/README.md` carries the detail.

### Host

Claude Code `2.1.296`, Codex `codex-cli 0.162.1`, `gauntlet` from
`/Users/johnss51/.local/bin/gauntlet`. The Claude Code version is the one
`claude --version` reported before the runs and the one every versioned entry
of the claude-auto transcript records (`"version":"2.1.296"` on 21 of its 40
lines; the other 19 are bookkeeping entries with no version field); the host
updated itself to `2.1.302` later the same day, after both smokes had
finished. The Coding-Agent models the runs
resolved to are `claude-opus-5-5` (claude-auto, via the host's Vertex switches)
and `gpt-6.1-sol` (codex).

### Files

Per smoke, under `smokes/<agent>/`:

- `stdout.txt` — the `quorum run` console output with the recorded `run exit`.
- `show.txt` — the `quorum show` render with the recorded `show exit`.
- `verdict.json`, `provenance.json` — copied from `results/<run>/`.
- `source-logs.txt` — the transcript files the capture read. The capture
  surfaces its own `sourceLogs` list only on a failed or zero-row capture
  (`src/runner/index.ts:547,563,583,629`), so on a passing run the list is
  taken by listing the transcripts under the workspace home with the agent's
  own `session_log_dir` and `session_log_glob`; each file says so in its
  header.

Transcripts, homes and workdirs are not copied: they stay in `results/`, which
is gitignored, and the run ids above are what makes them findable.

## Paired control

`control/` holds the predeclared paired control (plan Task 16; spec,
Verification, "Live"): twenty live sessions of one boundary scenario, ten on
the pre-change harness and ten on this branch, interleaved, and decided by
`tally.py` under the rule below.

### Pre-registration

Written and committed before the first session launched, in its own commit.
Nothing in this subsection is edited after launch; the results are appended
below it.

- **Scenario.** `scenarios/cost-api-field-rename-boundary`. It is
  byte-identical in both arms, as are `coding-agents/claude-auto.yaml` and
  `coding-agents/claude-context/` (`git diff --stat b6a923a31 66f14d12a` over
  those paths is empty).
- **Arms.**
  - `baseline`: evals `b6a923a31`, the pre-change revision, in the detached
    worktree `.worktrees/baseline-b6a923a31` of the evals checkout. It writes
    the legacy layout, record and agent tree both at `results/<run>/`.
  - `new`: this branch, harness at `66f14d12a`, run from the feature worktree
    `.worktrees/agent-write-isolation-relocation`. It writes the relocated
    layout, the record at `results/<run>/` and the agent tree at
    `results/workspaces/<run>/`. Evidence-only commits, this pre-registration
    among them, may follow `66f14d12a`; no harness path changes until the
    campaign ends.
- **Campaign root.** One absolute root for every launch in both arms:
  `/Users/johnss51/Development/agents/hyperpowers/evals/results`, a real
  directory. The launcher passes it as `--out-root`; the analyzer reads it as
  `--records`, with `--workspaces` at its `workspaces/`. No run is reached
  through, or linked to, any other path.
- **Coding-Agent.** `claude-auto`, which resolves to `claude-opus-5-5` on
  this host (Vertex). Claude Code `2.1.302`: `claude --version`, with
  `~/.local/bin/claude` linking to `~/.local/share/claude/versions/2.1.302`.
  Both are read again immediately before the launch and after the launcher
  exits. The analyzer pins the version from every session's transcript, in
  both arms.
- **Plugin root.** `/Users/johnss51/Development/agents/hyperpowers`
  (hyperpowers `bab5914`) for both arms, given as `SUPERPOWERS_ROOT` on the
  launch command only. The analyzer pins it from each run's `--plugin-dir`.
- **Gauntlet-Agent.** `claude-opus-5-5` (`GAUNTLET_AGENT_MODEL`), the Gauntlet
  fork at `a35607e` through the `~/.local/bin/gauntlet` shim.
- **Environment.** The campaign is launched under
  `env -u CLAUDE_CODE_ENABLE_TODO_TOOLS`, which this host sets to 1. Both
  arms' `coding-agents/claude-context/launch-agent` also drop every inherited
  `CLAUDE*` and `ANTHROPIC*` variable before sourcing the run's env file.
- **Size and order.** n = 10 qualifying sessions per arm, one session at a
  time, in the order B1 N1 B2 N2 … B10 N10. A replacement or relaunch runs
  immediately after the row it stands in for.
- **Observable.** Criterion 1, as the re-baseline defines it: a session
  passes when `criteria[0]` and `criteria[1]` of the Gauntlet-Agent's
  `result.json` both read `pass`. A `fail` in either is a fail. Anything else
  is indeterminate, a real trial that is never a pass. The composed final is
  not the observable.
- **Rule.** With `p_b` and `p_n` the criterion-1 pass counts of the baseline
  and new arms, over exactly ten qualifying sessions each: `p_b - p_n <= 2`
  proceeds; a larger gap stops for a human decision. The Fisher p the
  analyzer prints is information, not the rule. The clean baseline on this
  cell is 5/10 (`docs/experiments/2026-10-03-clean-harness-rebaseline.md`).
- **Void rule.** A grader-exit void (the Gauntlet-Agent's `status:
  investigate`, exited "without writing a result") occupies no slot and is
  replaced as `r<n>`, at most three times per arm; a fourth stops. A baseline
  setup void (`error.stage: setup`) is relaunched without consuming that cap,
  at most three times. A new-arm setup void stops.
- **Automatic stops.**
  - During the campaign (`control/launch-all.sh`): a new-arm run that is a
    setup void or `qa-agent-misconfigured`; a baseline run that is
    `qa-agent-misconfigured`; a log naming no run, several runs, or a run id
    that is malformed or repeated; a graded run without exactly one
    well-formed `result.json`; the void cap or the relaunch bound; an arm
    short of ten qualifying sessions. Exit 1, 2 or 3, with the reason as the
    manifest's last line.
  - After both arms (`control/tally.sh`, over `tally.py`): any integrity
    failure; any manipulation mismatch in either arm (plugin root, model,
    Claude Code version, an entrypoint other than `cli`, an instruction file
    loaded from outside the run's own trees, task-tool use); an arm without
    exactly ten qualifying sessions; a new-arm failure signature,
    `(verdict.final, error.stage or "none", sorted names of failed checks)`,
    that the baseline arm lacks; the threshold. Exit 2 to 5, or 1 for a
    named run without a verdict.
  - Any non-zero exit of either script is a stop for the human partner.
    Nothing is relaunched to change an answer, no run is replaced by hand
    and no log is edited.
- **Commands of record.** The launch, from the evals checkout, detached:

      cd /Users/johnss51/Development/agents/hyperpowers/evals && OUT_DIR=/Users/johnss51/Development/agents/hyperpowers/evals/.worktrees/agent-write-isolation-relocation/evidence/2026-10-14-agent-write-isolation-relocation/control SUPERPOWERS_ROOT=/Users/johnss51/Development/agents/hyperpowers nohup env -u CLAUDE_CODE_ENABLE_TODO_TOOLS bash /Users/johnss51/Development/agents/hyperpowers/evals/.worktrees/agent-write-isolation-relocation/evidence/2026-10-14-agent-write-isolation-relocation/control/launch-all.sh /Users/johnss51/Development/agents/hyperpowers/evals/results /Users/johnss51/Development/agents/hyperpowers/evals/.worktrees/baseline-b6a923a31 /Users/johnss51/Development/agents/hyperpowers/evals/.worktrees/agent-write-isolation-relocation > /Users/johnss51/Development/agents/hyperpowers/evals/.worktrees/agent-write-isolation-relocation/evidence/2026-10-14-agent-write-isolation-relocation/control/campaign.out 2>&1 &

  The tally, after the launcher exits 0:

      bash evidence/2026-10-14-agent-write-isolation-relocation/control/tally.sh /Users/johnss51/Development/agents/hyperpowers/evals/results /Users/johnss51/Development/agents/hyperpowers 2.1.302

  Both run outside this host's command sandbox, which refuses the fixture's
  `git init` (see "Smokes").

### The run

The pre-registration was committed as `83d3e617b` at 23:48:51 -0700 on
2026-10-18. The launch followed at about 23:49:50, with the command of record
above, run outside the sandbox: a sandboxed `git init -b main` under a
`results/` tree failed in the same session with the "Operation not permitted"
recorded under "Smokes". The tally ran inside the sandbox, because it only
reads the campaign root and writes `control/tally.txt`. The sandbox sentence
above holds for the launch alone. The controller then re-ran the analyzer
outside the sandbox against the recorded campaign: its output was identical
to `control/tally.txt`, exit 0. Two sandboxed re-runs, the reviewer's and the
implementer's, were identical too.

- **Window.** First session `…-20261019T064957Z-415e` (06:49:57Z); the
  manifest and `control/campaign.out` were last written at 00:32:34 -0700 on
  2026-10-19, about 42.5 minutes in all.
- **Launcher exit.** 0. `control/campaign.out` is the one line
  `complete: 10 qualifying per arm; manifest …/control/manifest.tsv`, which
  the launcher prints only on its success path. It ran detached under
  `nohup`, so its status was read from that line, not captured.
- **Rows.** 20, B1 N1 … B10 N10, with no void, replacement, relaunch or stop
  line.
- **Claude Code.** `2.1.302`, the same before the launch (23:49:49) and after
  the launcher exited (00:34:40): `claude --version` and the
  `~/.local/bin/claude` link both read it at both times. Every session's
  transcript records `2.1.302` and nothing else.
- **Harness provenance.** Every baseline run records `evals b6a923a`, every
  new run `evals 83d3e61` (the pre-registration commit, harness `66f14d12a`),
  both `evals_clean: true`; Gauntlet `a35607e+dirty` in both arms (untracked
  build files in the fork checkout).

### Results

`control/tally.txt` holds the analyzer's full output. Per session, from each
run's `verdict.json` and the Gauntlet-Agent's `result.json`:

| seq | arm | proc | run id | `criteria[0]` / `[1]` / `[2]` | criterion 1 | composed final |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | baseline | p1 | `…-20261019T064957Z-415e` | pass / pass / fail | pass | fail |
| 2 | new | p1 | `…-20261019T065211Z-e6fb` | fail / fail / fail | fail | fail |
| 3 | baseline | p2 | `…-20261019T065350Z-4155` | fail / fail / pass | fail | fail |
| 4 | new | p2 | `…-20261019T065549Z-7b2e` | pass / pass / fail | pass | fail |
| 5 | baseline | p3 | `…-20261019T065756Z-cd0e` | fail / fail / fail | fail | fail |
| 6 | new | p3 | `…-20261019T070000Z-384b` | pass / pass / fail | pass | fail |
| 7 | baseline | p4 | `…-20261019T070209Z-bfac` | fail / fail / pass | fail | fail |
| 8 | new | p4 | `…-20261019T070438Z-ebf1` | fail / fail / pass | fail | fail |
| 9 | baseline | p5 | `…-20261019T070659Z-82d0` | fail / fail / fail | fail | fail |
| 10 | new | p5 | `…-20261019T070904Z-f0bb` | pass / pass / fail | pass | fail |
| 11 | baseline | p6 | `…-20261019T071115Z-87b4` | pass / pass / fail | pass | fail |
| 12 | new | p6 | `…-20261019T071315Z-5683` | pass / pass / fail | pass | fail |
| 13 | baseline | p7 | `…-20261019T071521Z-ca5b` | fail / fail / fail | fail | fail |
| 14 | new | p7 | `…-20261019T071731Z-a7ad` | pass / pass / fail | pass | fail |
| 15 | baseline | p8 | `…-20261019T071940Z-bb33` | fail / fail / pass | fail | fail |
| 16 | new | p8 | `…-20261019T072204Z-62f7` | pass / pass / fail | pass | fail |
| 17 | baseline | p9 | `…-20261019T072416Z-f8bb` | pass / pass / fail | pass | fail |
| 18 | new | p9 | `…-20261019T072633Z-218d` | fail / fail / fail | fail | fail |
| 19 | baseline | p10 | `…-20261019T072817Z-3702` | pass / pass / fail | pass | fail |
| 20 | new | p10 | `…-20261019T073020Z-ce31` | fail / fail / fail | fail | fail |

Each run id elided here is `cost-api-field-rename-boundary-claude-auto-` and
the suffix shown.

- **Criterion 1.** Baseline 4/10, new 6/10. No session in either arm was
  indeterminate, void or excluded.
- **Manipulation checks.** All 20 sessions match every pin: plugin root
  `/Users/johnss51/Development/agents/hyperpowers`, model `claude-opus-5-5`,
  Claude Code `2.1.302`, entrypoint `cli`, no instruction file from outside
  the run, no task tools offered.
- **Integrity.** None failed; each arm showed its own layout.
- **Failure signatures.** One in each arm, the same one:
  `('fail', 'none', ())`, a Gauntlet-Agent fail with no error stage and no
  failed deterministic check. The new arm has no signature the baseline
  lacks.
- **Fisher.** Two-sided p = 0.6563 for 4/10 against 6/10, not separated
  (information only; not the rule).

### Decision

    decision: proceed threshold (p_b=4 p_n=6)
    tally exit: 0

`p_b - p_n = -2`, within the predeclared `<= 2`, and no automatic stop fired.
The relocation proceeds. With n = 10 per arm this rules out only a large drop
in the new arm, which was the purpose stated in the spec. It does not show
that the arms are equal, and the new arm's higher count is not a finding.

### Observations outside the rule

These do not enter the decision.

- **The composed final is 0/10 in both arms.** All 20 Gauntlet-Agent verdicts
  are `fail` and every deterministic check passed in every session. The
  re-baseline read this cell at 1/10 composed and 5/10 on criterion 1; this
  baseline arm's 4/10 is next to that.
- **No session invoked a skill.** Every session's first tool call was `Bash`,
  and brainstorming's description was in every session's skill listing, as
  in the re-baseline.
- **`criteria[2]`** passed in 3 baseline sessions (p2, p4, p8) and 1 new one
  (p4). Each was a session that failed criterion 1.
- **The Coding-Agent's CLI updated itself in 12 sessions.** The session's
  Claude Code installed `2.1.303` into its throwaway home
  (`home/.claude/.last-update-result.json`: `2.1.302` to `2.1.303`, `success`,
  with `home/.local/bin/claude` linking to the new install). This happened in
  six sessions per arm, at the same positions in both: p2 to p5, p7 and p8.
  The update does not reach the running session: every transcript records
  `2.1.302` only, and the host's own install stayed at `2.1.302` throughout.
  In 11 of the 12 sessions the update landed after the session's last
  transcript entry, 11 to 25 s later. The exception is baseline p4, whose
  update landed about 14 s before its last entry, and that entry still
  records `2.1.302`. In the baseline arm the
  six updating sessions are exactly its six criterion-1 failures; in the new
  arm five of its six updating sessions passed. The association points
  opposite ways in the two arms, so it is recorded here and not read as an
  effect. A re-run after the host takes `2.1.303` would be at a different
  version from this campaign.

### The archive

`runs/` holds every run of the campaign, all 20 counted, archived by
`control/archive-runs.sh` per `../README.md`'s four steps. The copies are
taken from the campaign root, which stays as quorum wrote it (copy, never move
or link), so `control/tally.sh` can be re-run against it. Each copy mirrors
its run's own layout:

- a baseline run, legacy, is the one directory `runs/baseline/<run>/`;
- a new run, relocated, is the record `runs/new/<run>/` beside its workspace
  `runs/new/workspaces/<run>/`.

Step 1 ran `scripts/strip-runs --results-root runs/<arm> --run <run>
--min-age-minutes 0` over each copy. The age floor is 0 because the
originals were minutes old, and it is the copy that is committed. Step 2
renamed each fixture's `.git` to `git-dir`, and any `home/.codex/` was
removed (none existed). Step 3 staged `runs/` with `git add -f`. Step 4 is
`control/archive-check.sh`, which reads the index:

    gitlinks: 0
    .git paths: 0
    ok baseline cost-api-field-rename-boundary-claude-auto-20261019T064957Z-415e transcripts=1 result.json=1 verdict.json=1
    … (one line per run, all 20 `ok`, each with one transcript, one
    result.json and one verdict.json)
    runs checked: 20
    archive-check exit: 0

`strip-runs` removed each copy's cloud-provider env file
(`home/.claude/.claude-env`) and session locks before staging.

Under its home, a copy keeps:

- the session transcript, `settings.json`, the `.claude.json` files and
  backups, `history.jsonl`, the CLI's `cache/`,
  `plugins/known_marketplaces.json`, and the update record above;
- two symlinks: `home/.local/bin/claude` where the CLI updated itself, and
  the URL-handler app's link to the host's
  `~/.local/share/claude/versions/2.1.302`;
- `shell-snapshots/`, 4 files across the 20 runs. These are the CLI's shell
  snapshot, whose tool-wrapper functions are followed by a single export,
  of `PATH`;
- `file-history/`, 8 files across the 20 runs: the CLI's saved versions of
  the fixture's `routes/users.js` as the agent edited it;
- `plugins/plugin-directory-cache-v2.json`, in two baseline runs only
  (`…-bfac` and `…-87b4`), 2,719,604 bytes each. It is the CLI's cache of the
  public plugin catalogue (3,605 listings, no host path), and no earlier
  archive carries it.

None of these is sensitive. Earlier archives also keep `shell-snapshots/`
and `file-history/`.

### Files

- `control/launch-all.sh`: the launcher (Task 15). `control/fake-quorum.sh`
  and `control/launch-all.test.sh` are its offline test.
- `control/manifest.tsv`: the ordered rows, with each launch's exit status and
  kind.
- `control/logs/<arm>/control-cost-api-field-rename-boundary-p<n>.log`: each
  row's `quorum run` output.
- `control/campaign.out`: the launcher's own output.
- `control/tally.sh`, `control/tally.txt`: the analyzer's invocation of
  record and its output, with the exit appended.
- `control/archive-runs.sh`, `control/archive-check.sh`: the archive and its
  post-check.
- `runs/baseline/`, `runs/new/`: the archived runs.

### Known limits of the analyzer and launcher

Found by the final branch review, after the campaign. None of them arose in
it: no archived main transcript records a `null` entrypoint or version, every
graded run had one readable `result.json` and none is a link, and no row was
superseded.

- An explicit JSON `null` for a transcript entry's `entrypoint` or `version`
  reads as absent, not as a value that fails the pin.
- An OS-level unreadable `result.json` (a dangling link, mode 000, a
  directory), or a mode-000 `verdict.json`, raises a traceback at exit 1: the
  same code as a named run without a verdict, never a false proceed. A
  `verdict.json` that is a dangling link or a directory reads as that missing
  verdict.
- A `result.json` symlinked to another run's result is read unflagged: the
  identity checks cover the run directories, not the files in them. A copied
  or hard-linked run whose transcript lists no instruction files passes the
  foreign-instruction pin vacuously. Both need operator tampering under the
  "move, never link" rule.
- `Path.resolve()` raises on a looped link under Python 3.12 and earlier, so
  the analyzer needs Python 3.13 or later. This host runs 3.15.
- A superseded row keeps its manipulation failures, so a superseded run that
  misses a pin still stops the campaign. That errs toward stopping.
- The launcher accepts a planted manifest symlink to a FIFO: noclobber refuses
  only an existing regular file, so the header write blocks and the launcher
  hangs.
- The exactly-three-criteria shape `read_result` requires is specific to this
  single-scenario campaign, whose story has three criteria.

The launcher that ran the campaign is the one at `66f14d12a`. The same review
amended it afterwards: its comment now says the graded test is restated from
the analyzer, it loads `result_files` and `read_result` from the `$TALLY` file
itself rather than from whatever `tally.py` sits beside it, and its `classify`
call takes the `-B -I` the evidence check already used. None of this changes
what the campaign ran: `$TALLY` was the default `../tally.py`, so the file
imported was the file named. The amended launcher passes the same 16 offline
cases of `control/launch-all.test.sh`.

## Corrections

- **The `;` leader** ("Decisions taken on this sweep", item 2, last
  paragraph). The `;` in one result's `tools` array
  (`sdd-plan-scoped-scratch-claude-auto-20260825T041623Z-d193`) is not a
  redirect target. It comes from `-exec grep … {} \;` in
  `scenarios/sdd-plan-scoped-scratch/checks.sh`: `commandLeaders` in
  `src/cli/replay-post-checks.ts` treats `{` and `}` as command boundaries,
  so the escaped `;` after `{}` is read as a new command's leader. `/dev/null`
  and `1` come from redirects as stated, and the conclusion stands: a
  spurious name can only add to the exercised set. The paragraph itself is
  left as written: everything down to the end of the pre-registration was
  committed before the campaign and is not edited after it.

## Assumptions

The spec carries two Assumptions. Where each was tested:

1. **Running inner commands under the agent's throwaway home rather than the
   operator's does not change the outcome of any shipped check.** Offline,
   by the corpus replay ("Replay"): 57 of 61 eligible scenarios replayed under
   both environments, plus 11 synthetic fixtures, with 0 divergences and exit
   0. Live, by the two smokes, whose post-checks passed under the new
   environment, and by this control: the scenario's four deterministic
   post-checks passed in all ten baseline sessions under the legacy
   environment and in all ten new sessions under the projected one. Holds
   wherever it was measured. The `go` caveat under "The `go` re-record"
   still applies.
2. **No agent CLI inspects the absolute workdir path beyond Antigravity's
   hidden-component rule.** Live, by the smokes ("Smokes"), for Claude Code
   and Codex, and for Claude Code again by the ten new-arm sessions of this
   control, each with its workdir under `results/workspaces/<run>/`. No
   session showed path trouble, and the arm did not read below the baseline.
   Antigravity was
   not run (the human partner's decision; `smokes/antigravity/README.md`),
   and Gemini, Kimi, OpenCode, Pi and Copilot were not exercised live. The
   Assumption therefore holds live for Claude Code and Codex only, and
   Antigravity's hidden-component rule, the one place the spec expected the
   path shape to matter, is untested live.
