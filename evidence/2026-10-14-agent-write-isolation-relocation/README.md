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
