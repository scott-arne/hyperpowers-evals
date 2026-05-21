# Drill

Drill is the behavioral eval harness for
[superpowers](https://github.com/obra/superpowers). It drives real coding-agent
CLIs through tmux sessions and checks whether they invoke and follow
superpowers skills correctly.

This is not a generic benchmark suite. Drill is an eval lab for workflow
compliance: skill triggering, worktree behavior, subagent coordination,
verification reflexes, review quality, and cost-shaping patterns.

## Safety Model

Drill has two very different execution modes:

- **Static/unit checks** are safe for public CI. These run `ruff`, `ty`, and
  `pytest`. They do not call model APIs and do not launch agent CLIs.
- **Live evals** are trusted-maintainer operations. They can launch Claude
  Code, Codex CLI, Gemini CLI, or Pi in permissive modes and may collect raw
  transcripts, tool calls, filesystem state, and local session logs.

Public CI must stay on the static/unit side of that line. Do not add API keys,
live `drill run ...` sweeps, or dangerous-mode agent launches to public CI.

## Live Eval Risk

Live evals intentionally run the backend under test with broad execution power:

- Claude backends use `--dangerously-skip-permissions`
- Codex uses `--dangerously-bypass-approvals-and-sandbox`
- Gemini uses `--yolo`
- Pi loads the local Superpowers package with `-e ${SUPERPOWERS_ROOT}`

Those subprocesses can currently inherit the parent shell environment and may
use the caller's normal home-directory config/log locations. In practice, that
means a live eval can see exported credentials, local agent configuration, and
other process environment state unless the runner starts it from a deliberately
clean shell.

Until per-run environment isolation is implemented, run live evals only from a
trusted local environment:

- Export only the API key needed for the selected backend.
- Avoid running with broad production or personal secrets in the environment.
- Treat `results/`, raw session logs, and verifier inputs as sensitive.
- Do not commit or paste raw run artifacts without checking them first.

## How Drill Works

1. **Setup** creates a temporary git repo with scenario-specific conditions.
2. **Actor** uses Sonnet to simulate a realistic user from the scenario turns.
3. **Agent** runs the backend under test in a tmux session.
4. **Collection** captures terminal output, filesystem state, and tool calls.
5. **Verifier** uses Sonnet to judge the transcript against semantic criteria.
6. **Assertions** run deterministic post-session checks against result artifacts.

Results are written under `results/<scenario>/<backend>/<timestamp>/`, which is
gitignored because those artifacts can contain sensitive transcripts.

## The Harness (Drill → Gauntlet migration)

Drill is being replaced. `harness/` is its successor: a small Python
harness that wraps **Gauntlet** — a general-purpose QA-agent framework
(a separate repo; its `gauntlet` CLI must be on `PATH`).

The rationale: Drill rebuilt infrastructure Gauntlet already has — a
tmux-driven target loop, evidence capture, multi-trial aggregation — and
once Gauntlet's QA agent gained a `bash` tool it could read the
agent-under-test's own session log directly, collapsing Drill's separate
actor and verifier LLMs into one. The harness keeps only what is
genuinely Drill-specific: per-scenario workdir setup, and post-run
deterministic assertions. Full rationale and phasing live in
[`docs/gauntlet-migration.md`](docs/gauntlet-migration.md); decisions and
deferrals in [`docs/migration-notes.md`](docs/migration-notes.md).

**Status:** the harness is built and scenarios are ported under
`harness/scenarios/`. Drill still works and is unchanged in behavior;
Phase 3 will delete it. Until then both run side by side.

### How the Harness Works

A `harness run` drives one scenario against one target:

1. **Target config** — `harness/targets/<target>.yaml` is parsed and its
   required env vars validated. An optional per-scenario `scenario.yaml`
   may restrict which targets a scenario accepts.
2. **Run dir** — a per-run directory is created under `results-harness/`.
   It doubles as Gauntlet's `--project-dir` and the evidence root.
3. **Isolation** — a fresh per-run agent-config dir (`CLAUDE_CONFIG_DIR`
   for Claude, `CODEX_HOME` for Codex) is seeded from a skeleton, so the
   agent under test never sees the host's real `~/.claude` / `~/.codex`,
   installed plugins, or prior sessions.
4. **Setup** — a temp workdir is created; the scenario's `setup.sh`
   builds the fixture and `preflight.sh` verifies its invariants. A
   non-zero exit from either aborts the run with a clear error.
5. **Context** — the per-target HOWTO (`harness/target_contexts/<target>/`)
   is copied into the run's `.gauntlet/context/` so the QA agent learns
   how to launch and observe the target.
6. **Drive** — `gauntlet run story.md --adapter tui --target <binary>`
   launches. Gauntlet's QA agent reads the screen *and* the agent's
   session log via bash, role-plays the user, and issues a verdict
   against the story's `## Acceptance Criteria`.
7. **Capture** — the agent's session-log dir is diffed (snapshot before,
   diff after), normalized per-target into `tool_calls.jsonl`, and token
   usage is written to `token_usage.json` (measurement only — it does
   not affect the verdict).
8. **Assert** — the scenario's `assertions/*.sh` run against the
   captured evidence, with `bin/` on `PATH` and `$HARNESS_WORKDIR`
   pointing at the scenario workdir.
9. **Compose** — the final verdict is `pass` iff Gauntlet's verdict is
   `pass` **and** every assertion exits 0. `verdict.json` is written to
   the run dir; the workdir is kept on failure (its path recorded in
   `workdir-path.txt`) and wiped on success.

The deterministic assertions are not a second verifier. Gauntlet's
agent, reading the same evidence, is authoritative for any single run.
The assertions are a frozen regression test that an acceptance criterion
still catches what it should — a guard that survives model updates and
verdict noise.

### Running Harness Scenarios

Run one scenario against one target:

```bash
uv run harness run harness/scenarios/triggering-writing-plans --target claude
```

List scenarios:

```bash
uv run harness list
```

Scaffold a new scenario, then validate its structure:

```bash
uv run harness new my-new-scenario
uv run harness check my-new-scenario
```

`harness check` with no arguments validates every scenario. It catches
the common authoring miss — a `setup.sh`, `preflight.sh`, or assertion
script without the executable bit, which the runner would otherwise skip
silently; `--fix` repairs the bit.

Harness runs are **live evals** — they launch real agent CLIs in
permissive modes. The [Safety Model](#safety-model) and
[Live Eval Risk](#live-eval-risk) sections apply unchanged; never run
them on public CI. The per-run config-dir isolation (step 3 above)
narrows the blast radius but is not a sandbox. `results-harness/` is
gitignored because run artifacts can contain sensitive transcripts.

### Targets

A target is one agent CLI under test. Its config is
`harness/targets/<name>.yaml`; its companion HOWTO,
`harness/target_contexts/<name>/HOWTO.md`, is prose the QA agent reads to
learn how to launch and observe that CLI. Both are authored once per CLI
and shared across scenarios.

| Target | CLI | Required environment |
| --- | --- | --- |
| `claude` | Claude Code | `ANTHROPIC_API_KEY`, `SUPERPOWERS_ROOT` |
| `codex` | Codex CLI | `OPENAI_API_KEY`, `SUPERPOWERS_ROOT` |

A target YAML declares the binary, the per-run config-dir env var, where
the CLI writes session logs, which normalizer parses them, and the
required env. Gauntlet's own `gauntlet` CLI must also be on `PATH`.

### Harness Scenarios

A harness scenario is a directory, `harness/scenarios/<name>/`:

```text
story.md          Gauntlet story — the QA agent's brief + acceptance criteria
setup.sh          builds the fixture workdir (runs before the agent)
preflight.sh      verifies fixture invariants (optional, runs after setup)
assertions/*.sh   post-run deterministic checks against captured evidence
scenario.yaml     optional — restricts compatible targets
```

`story.md` carries YAML frontmatter (`id`, `title`) and an
`## Acceptance Criteria` section. Write criteria to demand log evidence
(e.g. "a `Skill` invocation naming `superpowers:writing-plans` appears in
the agent's session log") so the QA agent must consult the log, not just
the screen.

### Writing a Harness Scenario

1. `uv run harness new <name>` stamps a structurally-valid skeleton.
2. Write `story.md`: brief the QA agent on the role it plays, the exact
   message to send the agent under test, and when it is done — plus
   evidence-demanding acceptance criteria. Follow the
   `writing-gauntlet-stories` skill.
3. Write `setup.sh` to build the fixture. Prefer
   `uv run setup-helpers run <helper>` over inline Python; if you need a
   new fixture, add a helper to `setup_helpers/` and register it in
   `setup_helpers/__init__.py`.
4. Write `preflight.sh` to assert the fixture is in the expected state
   before the agent runs.
5. Add `assertions/*.sh` — deterministic checks built from the `bin/`
   helpers (`skill-called`, `skill-before-tool`, `tool-called`,
   `tool-not-called`, …). Each must be executable; exit 0 = pass.
6. `uv run harness check <name>` to validate structure, then run it
   against a target.

Setup and preflight scripts run with `$HARNESS_WORKDIR` pointing at the
fixture workdir. Assertions run with `bin/` on `PATH` and the same
`$HARNESS_WORKDIR`. Setup helpers take `workdir: Path` and mutate it.

## Setup

Install Python dependencies:

```bash
uv sync --extra dev
```

Optional local hooks:

```bash
uv run pre-commit install
uv run pre-commit run --all-files
```

## Safe Checks

These are the checks expected in CI and on routine PRs:

```bash
uv run ruff check
uv run ty check
uv run pytest
```

## Live Eval Prerequisites

Live evals require the relevant backend CLI and credentials.

| Backend family | CLI | Required environment |
| --- | --- | --- |
| Claude | `claude` | `ANTHROPIC_API_KEY`, `SUPERPOWERS_ROOT` |
| Codex | `codex` | `OPENAI_API_KEY`, `SUPERPOWERS_ROOT` |
| Gemini | `gemini` | local Gemini CLI auth/config |
| Pi | `pi` | `SUPERPOWERS_ROOT` |

`SUPERPOWERS_ROOT` defaults to the parent directory of this checkout. That is
correct when Drill is checked out as `superpowers/evals`. In a standalone
`superpowers-evals` clone, set it explicitly:

```bash
export SUPERPOWERS_ROOT=/path/to/superpowers
```

Use a different `SUPERPOWERS_ROOT` when running RED/GREEN comparisons against
modified superpowers skill text.

## Running Live Evals

Run one scenario on one backend:

```bash
uv run drill run worktree-creation-from-main -b claude
```

Run repeated trials:

```bash
uv run drill run spec-writing-blind-spot -b claude-opus-4-6 --n 5
```

Sweep across backend variants:

```bash
uv run drill run spec-writing-blind-spot \
  --models claude-opus-4-6,claude-opus-4-7 \
  --n 10
```

Run against Pi, loading the local Superpowers package from `SUPERPOWERS_ROOT`:

```bash
uv run drill run triggering-writing-plans -b pi
```

Verify Codex native plugin hooks bootstrap Superpowers from an isolated
`CODEX_HOME`:

```bash
uv run drill run codex-native-hooks-bootstrap -b codex
```

Compare results:

```bash
uv run drill compare spec-writing-blind-spot
```

List scenarios:

```bash
uv run drill list
```

## Backends

Backend configs live in `backends/*.yaml`. They are intentionally
self-contained: command args, required env vars, hooks, idle detection,
terminal size, shutdown behavior, and log locations all live in the backend
file.

Current backend families:

| Backend | CLI | Model / variant |
| --- | --- | --- |
| `claude` | Claude Code | opus default |
| `claude-opus-4-6` | Claude Code | opus-4-6 |
| `claude-opus-4-7` | Claude Code | opus-4-7 |
| `claude-opus-4-6-1m` | Claude Code | opus-4-6, 1M context |
| `claude-opus-4-7-1m` | Claude Code | opus-4-7, 1M context |
| `codex` | Codex CLI with native plugin hooks in isolated `CODEX_HOME` | local configured model |
| `codex-no-hooks` | Codex CLI with legacy `.agents` symlink setup | local configured model |
| `gemini` | Gemini CLI | auto-gemini-3 |
| `gemini-2-5-flash` | Gemini CLI | gemini-2.5-flash |

## Scenarios

Scenario files live in `scenarios/*.yaml`. They define setup helpers, user turn
intents, limits, verifier criteria, and deterministic assertions.

| Category | Current coverage |
| --- | --- |
| Worktree | creation, detection, consent, detached HEAD, native-tool pressure |
| Skill triggering | core superpowers skill auto-invocation |
| SDD workflow | explicit invocation, mid-conversation invocation, real projects, YAGNI |
| Review/spec/verification | code review, spec review, targeting, blind spots, verification reflexes |
| Tool mapping | Codex and Gemini subagent/tool-name mapping |
| Cost baselines | token cost, tool-result bloat, duplicated artifacts, review fanout |
| Harness bootstrap | Codex native plugin hook startup behavior |

## Writing a Scenario

1. Add a setup helper in `setup_helpers/` if the scenario needs a custom repo
   fixture.
2. Register the helper in `setup_helpers/__init__.py`.
3. Add `scenarios/<scenario>.yaml` with setup, turns, limits, and verify
   sections.
4. Run the scenario locally against at least one backend.

Setup helpers take `workdir: Path` and mutate the temporary scenario repo.
Assertions run in the results directory with `$DRILL_WORKDIR` pointing to the
scenario workdir and `bin/` on `PATH`.

## Project Map

```text
drill/              Drill core engine and CLI (legacy; Phase 3 removes it)
  actor.py          user-simulator LLM
  assertions.py     deterministic post-session assertions
  backend.py        backend config loader and command builder
  cli.py            `drill run`, `drill compare`, `drill list`
  engine.py         tmux orchestration and run lifecycle
  normalizer.py     backend log normalization
  session.py        tmux session wrapper
  sweep.py          multi-backend, repeated-run orchestration
  verifier.py       LLM verifier
harness/            Gauntlet-based harness (Drill's successor)
  cli.py            `harness run`, `list`, `new`, `check`
  runner.py         per-run orchestration (one scenario, one target)
  target_config.py  per-target YAML loader
  scenario_config.py optional per-scenario config loader
  setup_step.py     runs scenario setup.sh / preflight.sh
  capture.py        session-log snapshot/diff + token capture
  normalizers.py    per-target session-log normalization
  assertions.py     deterministic assertion runner
  composer.py       gauntlet verdict + assertions → final verdict
  scaffold.py       `harness new` / `harness check`
  token_usage.py    per-target token-usage parsing
  targets/          per-target config YAML (claude, codex)
  target_contexts/  per-target HOWTO prose for the QA agent
  scenarios/        harness scenarios (one directory each)
backends/           Drill backend YAML configs
bin/                assertion helper scripts (shared by Drill and harness)
docs/               design notes, the migration spec, testing protocols
fixtures/           static repo fixtures + agent-config skeletons
prompts/            Drill actor/verifier prompts
scenarios/          Drill scenario YAML files
setup_helpers/      scenario fixture builders (shared) + `setup-helpers` CLI
tests/              pytest suite (tests/harness/ covers the harness)
```

## Contribution Rules

This repo inherits the quality bar of `superpowers`.

- One problem per PR.
- Do not commit generated run artifacts or secrets.
- Do not add live evals to public CI.
- Use the PR template and explain the security/eval-lab risk for changes that
  touch backends, shell execution, setup helpers, assertions, logs, or verifier
  input.
- Changes to behavior-shaping eval methodology need evidence, not just prose.

## Parent Submodule Bump

`superpowers-evals` is consumed by `superpowers` as the `evals` submodule.
After any PR merges to `main` in this repository, open a follow-up PR against
the parent `superpowers` repo targeting `dev` that bumps the `evals` submodule
pointer to the merged `superpowers-evals` commit.

Do not treat a `superpowers-evals` merge as fully propagated until that parent
submodule bump PR exists.

Security reporting details live in [SECURITY.md](SECURITY.md). The broader
design is documented in [docs/design.md](docs/design.md).
