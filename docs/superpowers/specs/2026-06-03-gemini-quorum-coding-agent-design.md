# Gemini Quorum Coding-Agent Target - design specification

**Linear:** PRI-2042
**Status:** Specification. Ready for Drew review. Not yet implemented.
**Date:** 2026-06-03
**Context:** Superpowers supports Gemini CLI through `gemini-extension.json` and
`GEMINI.md`. Quorum already has a `gemini` session-log normalizer, but Gemini
is not yet available as a first-class `--coding-agent gemini` target.

---

## Goal

Add `gemini` as a first-class Quorum Coding-Agent target so the same behavioral
scenarios used for Claude, Codex, and Antigravity can exercise Superpowers
inside Gemini CLI.

The harness should be reproducible and should not depend on Drew's personal
`~/.gemini` state. Each run gets an isolated Gemini home under the Quorum run
directory, authenticated from environment variables and seeded from the local
`SUPERPOWERS_ROOT` checkout.

Expected maintainer command shape:

```bash
export SUPERPOWERS_ROOT=/path/to/superpowers
export GEMINI_API_KEY=...
uv run quorum run scenarios/<scenario> --coding-agent gemini
```

## Non-goals

- Reusing global `~/.gemini` auth, extension links, chat history, or settings.
- Copying `~/.gemini/oauth_creds.json` into run directories unless API-key auth
  proves unusable.
- Public CI live Gemini runs. Like other live Quorum evals, Gemini runs remain
  trusted-maintainer operations.
- Token/cost capture for Gemini in v1. `capture.py` already treats Gemini token
  parsing as unsupported.
- Rewriting the existing Coding-Agent config model.
- A generic extension-source abstraction for all Coding-Agents.

## Current harness model

Quorum already has the extension points needed for Gemini:

- `coding-agents/<name>.yaml` defines the target binary, per-run config env
  var, session-log directory, log glob, normalizer, required env, and timeout.
- `<name>-context/launch-agent` bakes cwd, config-dir, and permissive flags into
  one executable so the Gauntlet-Agent can launch the Coding-Agent reliably.
- `<name>-context/HOWTO.md` tells the Gauntlet-Agent to use the generated
  launcher.
- `quorum/runner.py` creates a fresh per-run config dir before scenario setup.
- `quorum/normalizers.py` already registers `normalizer: gemini`.

Gemini should fit this model with one target-specific provisioning hook, not a
new runner architecture.

## Gemini runtime setup

Add `coding-agents/gemini.yaml`:

```yaml
name: gemini
binary: gemini
agent_config_env: GEMINI_CLI_HOME
session_log_dir: "${GEMINI_CLI_HOME}/tmp"
session_log_glob: "**/chats/session-*.jsonl"
normalizer: gemini
required_env:
  - GEMINI_API_KEY
  - SUPERPOWERS_ROOT
max_time: 10m
```

`GEMINI_CLI_HOME` is Quorum-owned and points at
`<run>/coding-agent-config`. The runner does not read from or write to the
user's real `~/.gemini`.

The launcher should run, in effect:

```bash
cd "$QUORUM_AGENT_CWD"
exec env \
  GEMINI_CLI_HOME="$GEMINI_CLI_HOME" \
  GEMINI_API_KEY="$GEMINI_API_KEY" \
  GEMINI_DEFAULT_AUTH_TYPE=gemini-api-key \
  GEMINI_CLI_TRUST_WORKSPACE=true \
  gemini --yolo "$@"
```

Implementation must verify the exact installed CLI behavior before committing
to the final launcher flags. Local help currently exposes both `--yolo` and
`--approval-mode`; the plan should verify which value produces an interactive,
prompt-free eval session.

## Superpowers install

Gemini runner provisioning should seed Superpowers directly into the isolated
Gemini home from local `SUPERPOWERS_ROOT`.

Do not rely on `gemini extensions link` in the run path. A fresh
`GEMINI_CLI_HOME` probe prompted for workspace trust before linking the local
extension, which is not acceptable inside a Gauntlet-driven eval.

The implementation should inspect current Gemini extension layout before
writing files, then seed the minimum stable state needed for Gemini to load the
local Superpowers extension. The expected source files are:

- `$SUPERPOWERS_ROOT/gemini-extension.json`
- `$SUPERPOWERS_ROOT/GEMINI.md`
- `$SUPERPOWERS_ROOT/skills/using-superpowers/SKILL.md`
- `$SUPERPOWERS_ROOT/skills/using-superpowers/references/gemini-tools.md`

The runner should assert that the seeded isolated home contains the files
Gemini needs for extension discovery and that no chat transcript was created
before Quorum takes the session-log snapshot.

If direct file seeding is not enough for current Gemini CLI extension
discovery, the implementation may switch to a documented noninteractive
`gemini extensions install` path. It should not fall back to global
`~/.gemini` coupling without a separate design update.

## Data flow

1. `quorum run scenarios/foo --coding-agent gemini` loads
   `coding-agents/gemini.yaml`.
2. Runner allocates `<run>/coding-agent-config` and calls
   `_seed_gemini_config`.
3. `_seed_gemini_config` validates env, verifies `gemini` is on `PATH`, writes
   prompt-free Gemini home state, and stages Superpowers from
   `SUPERPOWERS_ROOT`.
4. Scenario setup and pre-checks run normally.
5. Runner populates `gemini-context` with literal paths, including
   `$QUORUM_LAUNCH_AGENT`, `$QUORUM_AGENT_CWD`, and `$GEMINI_CLI_HOME`.
6. Runner snapshots `${GEMINI_CLI_HOME}/tmp/**/chats/session-*`.
7. Gauntlet drives the QA agent, which launches Gemini through the generated
   launcher.
8. Gemini writes session logs under the isolated home.
9. Quorum captures new session files and normalizes tool calls with the
   existing `gemini` normalizer.
10. Post-checks compose verdicts through the normal Quorum path.

## Failure modes

Runner setup should fail clearly when:

- `GEMINI_API_KEY` is missing.
- `SUPERPOWERS_ROOT` is missing.
- `SUPERPOWERS_ROOT` does not contain the expected Gemini extension files.
- `gemini` is not on `PATH`.
- isolated Gemini home seeding does not produce the expected extension/context
  files.
- a Gemini transcript exists before the capture snapshot.

After a run, Gemini should get the same explicit capture diagnostics
Antigravity has: if no Gemini session files appear under the isolated home, the
verdict should be `indeterminate` with a capture-stage message explaining that
no Gemini transcript was captured. This is more useful than letting downstream
trace checks all report "never called".

## Testing strategy

Before live evals, cover the harness with unit tests:

- config-loader coverage for `coding-agents/gemini.yaml`.
- runner seeding tests for isolated `GEMINI_CLI_HOME`.
- missing `GEMINI_API_KEY` and missing `SUPERPOWERS_ROOT` failures.
- expected Superpowers extension/context files after seeding.
- trust/no-prompt setting writes.
- pre-existing transcript rejection before capture snapshot.
- generated launcher/context substitution for `$GEMINI_CLI_HOME` and
  `$QUORUM_LAUNCH_AGENT`.
- explicit missing-transcript capture diagnostic for Gemini.
- Gemini normalizer expansion only if current CLI logs show a shape not covered
  by existing tests.

Static verification before implementation completion:

```bash
uv run ruff check
uv run ty check
uv run quorum check
uv run pytest
```

Live smoke after the implementation plan is approved:

```bash
uv run quorum run scenarios/<small-compatible-scenario> --coding-agent gemini
uv run quorum show <run-dir>
```

The live smoke should verify that Gemini loads Superpowers from the isolated
home, writes logs under that home, and produces normalized tool-call rows for a
scenario that uses a skill.

## Open verification items

Implementation should verify these facts from the installed Gemini CLI before
coding the final behavior:

- the final approval flag: `--yolo`, `--approval-mode yolo`, or another
  documented value.
- the exact isolated session-log path and glob under a fresh
  `GEMINI_CLI_HOME`.
- the exact extension discovery files needed for direct seeding.
- the exact API-key auth mode value for `GEMINI_DEFAULT_AUTH_TYPE`.
- whether `GEMINI_CLI_TRUST_WORKSPACE=true` fully suppresses trust prompts in
  interactive mode.

## Acceptance

- `uv run quorum list` and `uv run quorum run ... --coding-agent gemini` treat
  Gemini as a known Coding-Agent target.
- Gemini runs use an isolated per-run `GEMINI_CLI_HOME`.
- Gemini runs require `GEMINI_API_KEY` and do not copy or read personal
  `~/.gemini/oauth_creds.json`.
- Superpowers is staged from local `SUPERPOWERS_ROOT`.
- The generated launcher starts Gemini from the resolved launch cwd with
  prompt-free trust and approval settings.
- Quorum captures Gemini session logs from the isolated home and normalizes
  tool calls through `normalizer: gemini`.
- Missing Gemini transcripts produce an explicit capture-stage
  `indeterminate` verdict.
- Tests cover config loading, runner seeding, failure modes, launcher
  substitution, and capture diagnostics.
