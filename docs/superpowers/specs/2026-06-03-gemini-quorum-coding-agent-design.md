# Gemini Quorum Coding-Agent Target - design specification

**Linear:** PRI-2042
**Status:** Specification, amended after staff-review pass. Ready for Drew
review. Not yet implemented.
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
session_log_dir: "${GEMINI_CLI_HOME}/.gemini/tmp"
session_log_glob: "**/chats/**/*.json*"
normalizer: gemini
required_env:
  - GEMINI_API_KEY
  - SUPERPOWERS_ROOT
max_time: 10m
max_concurrency: 1
```

`GEMINI_CLI_HOME` is Quorum-owned and points at
`<run>/coding-agent-config`. The runner does not read from or write to the
user's real `~/.gemini`. Gemini CLI treats `GEMINI_CLI_HOME` as a home
directory and creates its own `.gemini` tree inside it. The configured glob
must be verified against a fresh live run. It should capture JSONL and JSON
chat logs, including nested/subagent chat files, without reaching outside the
isolated home.

The launcher should run, in effect:

```bash
cd "$QUORUM_AGENT_CWD"
set -a
. "$GEMINI_ENV_FILE"
set +a
exec env \
  GEMINI_CLI_HOME="$GEMINI_CLI_HOME" \
  GEMINI_DEFAULT_AUTH_TYPE=gemini-api-key \
  GEMINI_CLI_TRUST_WORKSPACE=true \
  gemini --skip-trust --approval-mode=yolo "$@"
```

The QA agent's shell cannot be trusted to inherit arbitrary environment
variables from Quorum. The runner must therefore not rely on an inherited
`GEMINI_API_KEY`. It should write a chmod-0600 per-run env file under the
isolated config dir, sourced by the generated launcher, containing only the
runtime secret(s) Gemini needs. `$GEMINI_ENV_FILE` in the launcher template
must be replaced with a literal path during context population, just like
`$GEMINI_CLI_HOME` and `$QUORUM_AGENT_CWD`. This is still isolated from
personal state, but it means Gemini run directories are secret-bearing
live-eval artifacts and must not be published or committed.

Runner provisioning should also write `${GEMINI_CLI_HOME}/.gemini/settings.json`
with auth selected explicitly:

```json
{
  "security": {
    "auth": {
      "selectedType": "gemini-api-key"
    }
  }
}
```

Implementation must verify that these settings plus the env file produce a
prompt-free interactive startup. Local Gemini CLI `0.41.2` exposes
`--skip-trust` and `--approval-mode=yolo`; bare `--yolo` exists but should not
be the primary launcher form.

## Superpowers install

Gemini runner provisioning should install Superpowers into the isolated Gemini
home from local `SUPERPOWERS_ROOT`.

The preferred provisioning path is Gemini's own extension linker with explicit
consent:

```bash
GEMINI_CLI_HOME="$GEMINI_CLI_HOME" \
GEMINI_CLI_TRUST_WORKSPACE=true \
gemini extensions link "$SUPERPOWERS_ROOT" --consent
```

A local probe with Gemini CLI `0.41.2` linked and enabled Superpowers
noninteractively with this command, writing metadata under:

```text
$GEMINI_CLI_HOME/.gemini/extensions/superpowers/.gemini-extension-install.json
$GEMINI_CLI_HOME/.gemini/extensions/extension-enablement.json
$GEMINI_CLI_HOME/.gemini/extension_integrity.json
```

This is preferable to hand-copying files because Gemini extensions are
layout-sensitive and the linker writes enablement and integrity metadata. The
implementation should assert that `gemini extensions list` reports Superpowers
enabled in the isolated home.

`SUPERPOWERS_ROOT` must contain:

- `$SUPERPOWERS_ROOT/gemini-extension.json`
- `$SUPERPOWERS_ROOT/GEMINI.md`
- `$SUPERPOWERS_ROOT/skills/using-superpowers/SKILL.md`
- `$SUPERPOWERS_ROOT/skills/using-superpowers/references/gemini-tools.md`

The linked extension must expose the full Superpowers skill tree from the local
checkout, not a minimal copy of `using-superpowers`. A small copy would hide
skills from Gemini's extension discovery and produce misleading harness
coverage.

If `extensions link --consent` stops working noninteractively, the
implementation may switch to `gemini extensions install "$SUPERPOWERS_ROOT"
--consent --skip-settings` after verifying that it writes equivalent metadata.
It should not fall back to global `~/.gemini` coupling without a separate design
update.

## Data flow

1. `quorum run scenarios/foo --coding-agent gemini` loads
   `coding-agents/gemini.yaml`.
2. Runner allocates `<run>/coding-agent-config` and calls
   `_seed_gemini_config`.
3. `_seed_gemini_config` validates env, verifies `gemini` is on `PATH`, writes
   prompt-free Gemini auth/settings state, writes the chmod-0600 runtime env
   file, and links Superpowers from `SUPERPOWERS_ROOT` with `extensions link
   --consent`.
4. Scenario setup and pre-checks run normally.
5. Runner populates `gemini-context` with literal paths, including
   `$QUORUM_LAUNCH_AGENT`, `$QUORUM_AGENT_CWD`, and `$GEMINI_CLI_HOME`.
6. Runner snapshots `${GEMINI_CLI_HOME}/.gemini/tmp/**/chats/**/*.json*`.
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
- isolated Gemini home provisioning does not produce the expected
  extension/context metadata.
- `gemini extensions list` does not report Superpowers enabled from the
  isolated home.
- auth/trust/approval startup preflight prompts, downgrades approval mode, or
  cannot run without user interaction.
- a Gemini transcript exists before the capture snapshot.

After a run, Gemini should get the same explicit capture diagnostics
Antigravity has: if no Gemini session files appear under the isolated home, or
if transcripts appear but normalize to zero tool-call rows, the verdict should
be `indeterminate` with a capture-stage message explaining the capture problem.
This is more useful than letting downstream trace checks all report "never
called" or allowing file-only scenarios to false-green while capture is broken.

`CodingAgentConfigError` should also become a setup-stage indeterminate verdict
instead of falling through to the generic unexpected-crash path.

## Testing strategy

Before live evals, cover the harness with unit tests:

- config-loader coverage for `coding-agents/gemini.yaml`.
- runner seeding tests for isolated `GEMINI_CLI_HOME`.
- missing `GEMINI_API_KEY` and missing `SUPERPOWERS_ROOT` failures.
- expected Superpowers extension/context files after seeding.
- `gemini extensions list` reports Superpowers enabled under the isolated home.
- trust/no-prompt setting writes.
- chmod-0600 runtime env-file creation without logging the API key.
- pre-existing transcript rejection before capture snapshot.
- generated launcher/context substitution for `$GEMINI_CLI_HOME` and
  `$QUORUM_LAUNCH_AGENT`.
- explicit no-transcript and zero-normalized-row capture diagnostics for
  Gemini.
- golden normalizer tests from a sanitized real Gemini transcript covering at
  least `run_shell_command`, `read_file`, `write_file` or `replace`,
  `activate_skill`, and `list_directory`.
- trace-tool coverage showing `skill-called` works for Gemini-normalized rows.
- launch-cwd/trust coverage for scenarios that use `.quorum-launch-cwd`.

Static verification before implementation completion:

```bash
uv run ruff check
uv run ty check
uv run quorum check
uv run pytest
```

Live smoke after the implementation plan is approved:

```bash
uv run quorum run scenarios/gemini-superpowers-bootstrap --coding-agent gemini
uv run quorum show <run-dir>
```

Add `scenarios/gemini-superpowers-bootstrap` as the mandatory first live smoke.
It should be restricted with `# coding-agents: gemini`, produce a deterministic
file result, assert normalized tool-call evidence, and assert a skill invocation
such as `skill-called superpowers:brainstorming`.

After the bootstrap smoke passes, run a curated 3-5 scenario Gemini subset.
Only after that subset passes should the implementation audit scenario
directives and try a broader `run-all --coding-agents gemini --jobs 1` sweep.

## Open verification items

Implementation should verify these facts from the installed Gemini CLI before
coding the final behavior:

- the final trust/approval flags, especially `--skip-trust` with
  `--approval-mode=yolo`.
- the exact isolated session-log path and glob under a fresh
  `GEMINI_CLI_HOME`.
- the exact extension metadata written by `gemini extensions link --consent`.
- the exact API-key auth mode value for `GEMINI_DEFAULT_AUTH_TYPE`.
- whether `GEMINI_CLI_TRUST_WORKSPACE=true` fully suppresses trust prompts in
  interactive mode.
- whether seeded `settings.json` suppresses the API-key auth picker.
- whether the runtime env file is required, or whether Gemini can persist
  API-key auth into the isolated home without carrying the key into the
  interactive launcher.

Useful verification commands:

```bash
gemini --version
gemini --help | rg 'skip-trust|approval-mode|yolo|extensions'
gemini extensions link --help
GEMINI_CLI_HOME="$tmp" GEMINI_CLI_TRUST_WORKSPACE=true \
  gemini extensions link "$SUPERPOWERS_ROOT" --consent
GEMINI_CLI_HOME="$tmp" gemini extensions list
find "$GEMINI_CLI_HOME/.gemini/tmp" -path '*/chats/*' -type f -print
```

## Acceptance

- `uv run quorum run ... --coding-agent gemini` treats Gemini as a known
  Coding-Agent target, and `run-all` can discover/select the target.
- Gemini runs use an isolated per-run `GEMINI_CLI_HOME`.
- Gemini runs require `GEMINI_API_KEY` and do not copy or read personal
  `~/.gemini/oauth_creds.json`.
- Superpowers is linked from local `SUPERPOWERS_ROOT` through
  `gemini extensions link --consent` or an equivalently verified
  noninteractive install flow.
- The generated launcher starts Gemini from the resolved launch cwd with
  prompt-free trust and approval settings.
- Quorum captures Gemini session logs from the isolated home and normalizes
  tool calls through `normalizer: gemini`.
- Missing Gemini transcripts and zero-row Gemini transcript captures produce
  explicit capture-stage `indeterminate` verdicts.
- A dedicated `gemini-superpowers-bootstrap` scenario passes live before any
  broader Gemini sweep.
- Tests cover config loading, runner seeding, failure modes, launcher
  substitution, and capture diagnostics.
