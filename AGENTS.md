# Superpowers Evals

Behavioral eval lab for superpowers. Python 3.11+, managed with uv.

The active runner is the Gauntlet-backed **Quorum**. Code, CLI, paths, and
inline prose all use lowercase `quorum`.

## Commands

- **install**: `uv sync --extra dev`
- **test**: `uv run pytest`
- **test single**: `uv run pytest tests/quorum/test_runner.py -x -q`
- **lint**: `uv run ruff check`
- **format**: `uv run ruff format`
- **typecheck**: `uv run ty check`
- **validate scenarios**: `uv run quorum check`
- **run scenario**: `uv run quorum run scenarios/<name> --coding-agent <claude|codex>`
- **list scenarios**: `uv run quorum list`
- **scaffold scenario**: `uv run quorum new <name>`
- **show verdict**: `uv run quorum show [<target>]`

## Architecture

- `quorum/runner.py` — per-run orchestration: setup, pre-checks, Gauntlet drive, capture, post-checks, verdict.
- `quorum/checks.py` — sources `checks.sh`, runs `pre()`/`post()`, collects structured check records.
- `quorum/composer.py` — composes Gauntlet-Agent verdict + deterministic checks into `pass | fail | indeterminate`.
- `quorum/coding_agent_config.py` — per-Coding-Agent YAML loader and session-log config.
- `quorum/capture.py` — session-log snapshot/diff, normalized tool-call capture, token capture.
- `quorum/normalizers.py` — Coding-Agent session-log normalizers.
- `quorum/scaffold.py` — `quorum new` / `quorum check` implementation.
- `quorum/show.py` — verdict renderer for triage.
- `bin/` — check-tool vocabulary; tools emit one JSON record each.
- `coding-agents/<name>.yaml` — per-Coding-Agent CLI config.
- `coding-agents/<name>-context/HOWTO.md` — instructions copied into Gauntlet-Agent context.
- `coding-agents/<name>-home-skeleton/` — seeded into per-run `CLAUDE_CONFIG_DIR` / `CODEX_HOME`.
- `scenarios/*/` — active scenarios, one directory each.
- `setup_helpers/*.py` — fixture creators (CLI: `uv run setup-helpers run <helper>`).
- `fixtures/` — static fixture repos (e.g. `template-repo/`).

## Scenario Conventions

- A quorum scenario is a directory under `scenarios/<name>/`.
- Required files: `story.md`, `setup.sh`, `checks.sh`.
- `story.md` briefs the Gauntlet-Agent and includes acceptance criteria.
- `setup.sh` builds the fixture using `$QUORUM_WORKDIR`; prefer
  `uv run setup-helpers run <helper>` over inline Python.
- `checks.sh` contains exactly `pre()` and `post()` function definitions and no
  top-level executable statements.
- `checks.sh` should not have the executable bit set.
- Check tools run from the fixture workdir with `bin/` on `PATH`.
- Post-checks that need sibling run artifacts can use `$QUORUM_RUN_DIR`.
- Use the top-of-file `# coding-agents: <csv>` directive to restrict a scenario
  to specific Coding-Agents.
- Use `requires-tool <name>` in `pre()` when a scenario depends on a local
  toolchain such as `go` or `npm`.

## Verdict Model

quorum verdicts are three-valued:

- `pass` — Gauntlet-Agent passed and all post-checks passed.
- `fail` — Gauntlet-Agent failed or a post-check failed.
- `indeterminate` — setup/pre-check/capture/quorum failure, Gauntlet
  `investigate`, or empty trace when trace checks are present.

Triaging a non-passing quorum run starts with `uv run quorum show [<target>]`
and `docs/superpowers/skills/triaging-a-failing-eval.md`.

## Safety

Static/unit checks are safe for CI:

```
uv run ruff check
uv run ty check
uv run quorum check
uv run pytest
```

Live evals are trusted-maintainer operations only. They launch agent CLIs in
permissive modes and can capture sensitive transcripts, tool calls, filesystem
state, and token data. Do not add live `quorum run ...` invocations, API keys,
or dangerous-mode agent launches to public CI.

## Required Env For Live Evals

```
ANTHROPIC_API_KEY=sk-...
OPENAI_API_KEY=sk-...
```

When this repo is checked out as `superpowers/evals`, quorum defaults
`SUPERPOWERS_ROOT` to the parent `superpowers` checkout. In a standalone
`superpowers-evals` clone, export it explicitly:

```
export SUPERPOWERS_ROOT=/path/to/superpowers
```

## Parent Superpowers Submodule

`superpowers-evals` is consumed by `superpowers` as the `evals` submodule.
After any PR merges to `main` here, open a follow-up PR against the parent
`superpowers` repo targeting `dev` that bumps the `evals` submodule pointer to
the merged `superpowers-evals` commit.

Do not treat a `superpowers-evals` merge as fully propagated until that parent
submodule bump PR exists.
