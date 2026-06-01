# Antigravity CLI target - design specification

**Status:** Specification, ready for Drew review. Not yet implemented.
**Date:** 2026-06-01
**Context:** Google Antigravity 2.0 CLI support in Superpowers has landed on
`superpowers` `dev`, but not yet `main`. Quorum needs a first-class
Antigravity Coding-Agent target so we can test that support against the same
behavioral scenarios used for Claude and Codex.

---

## Goal

Add `antigravity` as a first-class Quorum Coding-Agent target with parity to
the existing Claude and Codex harnesses.

The goal is not to test whether `agy` can answer prompts. The goal is to test
whether Superpowers works inside Antigravity across the same behavioral
scenario classes Quorum already cares about: skill triggering, tool mapping,
subagent behavior, verification reflexes, worktree behavior where applicable,
and trace-backed evidence.

The source contract matches Claude and Codex:

```bash
export SUPERPOWERS_ROOT=/path/to/superpowers
uv run quorum run scenarios/<scenario> --coding-agent antigravity
```

`SUPERPOWERS_ROOT` remains the canonical local checkout under test. There is
no Antigravity-specific source override in this design. If Quorum later needs
URL-source testing, that should be designed as a generic harness capability,
with clear caveats that not every Coding-Agent can install from URLs in the
same way.

## Non-goals

- SDK-based Antigravity driving. This design tests the CLI/plugin surface.
- Public CI or fully headless auth support. Antigravity live evals are
  trusted-maintainer operations.
- Token/cost capture for Antigravity. The local Antigravity transcript and
  conversation files do not currently provide a stable usage surface.
- A generic plugin-source abstraction across all Coding-Agents.
- Rewriting existing Claude or Codex setup.

## Current harness model

Quorum already has the right extension points:

- `coding-agents/<name>.yaml` selects the CLI binary, config env var, session
  log directory, log glob, normalizer, required environment, and default
  timeout.
- `<name>-context/launch-agent` bakes cwd, config-dir, and dangerous-mode
  flags into one command so the Gauntlet-Agent cannot accidentally launch from
  the wrong directory.
- `<name>-context/HOWTO.md` tells the Gauntlet-Agent how to launch, observe,
  wait for, and shut down the Coding-Agent.
- `quorum/normalizers.py` converts backend-specific session logs into canonical
  `coding-agent-tool-calls.jsonl` rows.
- `bin/_skill_predicate.jq` is the shared definition of "skill invocation" for
  `skill-called`, `skill-before-tool`, and related trace checks.

Antigravity should fit this model rather than adding a new runner architecture.

## Antigravity runtime setup

Add `coding-agents/antigravity.yaml`:

```yaml
name: antigravity
binary: agy
agent_config_env: ANTIGRAVITY_CONFIG_DIR
session_log_dir: "${ANTIGRAVITY_CONFIG_DIR}/.gemini/antigravity-cli/brain"
session_log_glob: "**/transcript.jsonl"
normalizer: antigravity
required_env:
  - SUPERPOWERS_ROOT
max_time: 10m
```

`ANTIGRAVITY_CONFIG_DIR` is a Quorum-owned per-run directory under
`<run>/coding-agent-config`, analogous to `CLAUDE_CONFIG_DIR` and `CODEX_HOME`.
The Antigravity launcher points `agy` at an isolated `.gemini` tree inside that
directory.

The launcher should run, in effect:

```bash
cd "$QUORUM_AGENT_CWD"
exec env \
  ANTIGRAVITY_CONFIG_DIR="$ANTIGRAVITY_CONFIG_DIR" \
  AGY_CLI_DISABLE_AUTO_UPDATE=true \
  agy \
    --gemini_dir="$ANTIGRAVITY_CONFIG_DIR/.gemini" \
    --dangerously-skip-permissions \
    --log-file "$ANTIGRAVITY_CONFIG_DIR/agy.log" \
    "$@"
```

The live Quorum target should be interactive, matching Claude and Codex. Do
not use `--print` in the main launcher: `--print` runs a single
non-interactive prompt, which would test prompt-answering rather than letting
the Gauntlet-Agent drive the Coding-Agent through the normal scenario flow.
`--print` is still useful for setup preflight and maintainer smoke tests, where
one exact-response probe can verify `agy` auth and config isolation quickly.

Do not use `--app_data_dir` in v1. Official Antigravity SDK docs expose
`app_data_dir`, and the installed binary contains related strings, but the CLI
does not document it. A live canary showed `--gemini_dir` alone isolates config,
app data, logs, conversations, and transcripts under the requested `.gemini`
tree.

## Unsupported Antigravity surface

`--gemini_dir` is required for Quorum isolation, but it is not documented in
official Antigravity CLI docs or in the public `google-antigravity` repositories
as of 2026-06-01.

The implementation should keep this dependency contained:

- Only the Antigravity launcher and Antigravity setup helper should know about
  `--gemini_dir`.
- Docs should call it out as a hidden compatibility dependency.
- A fast smoke/preflight should verify that `agy --gemini_dir=<tmp>` writes
  config and transcripts under `<tmp>/.gemini`. That preflight may use
  `--print-timeout <duration> --print <prompt>`; when it does, `--print-timeout`
  must appear before `--print` because observed `agy` behavior treats arguments
  after `--print` as prompt content.
- If isolation or capture cannot be proven, the run should become
  `indeterminate` with an explicit Antigravity diagnostic, not a misleading
  "skill was never called" failure.

`AGY_CLI_DISABLE_AUTO_UPDATE=true` should always be set so a live eval does
not update the CLI during a run.

## Superpowers install

Antigravity setup should install Superpowers from local `SUPERPOWERS_ROOT` into
the isolated Antigravity config dir before the run starts.

Expected command shape:

```bash
AGY_CLI_DISABLE_AUTO_UPDATE=true \
agy --gemini_dir="$ANTIGRAVITY_CONFIG_DIR/.gemini" \
  plugin install "$SUPERPOWERS_ROOT"
```

With current `agy` behavior, this installs Superpowers under:

```text
$ANTIGRAVITY_CONFIG_DIR/.gemini/config/plugins/superpowers/
```

The official CLI plugin prose still mentions
`~/.gemini/antigravity-cli/plugins`, but the official changelog and current
binary behavior install plugins into shared `.gemini/config/plugins`. The
implementation should assert the actual installed plugin path rather than
depending only on prose docs.

The setup helper should fail clearly if:

- `SUPERPOWERS_ROOT` is missing.
- `agy` is missing.
- `agy plugin install "$SUPERPOWERS_ROOT"` fails.
- The expected plugin files are absent after install.

## Capture and normalization

Antigravity capture produces the same Quorum artifact as every other target:

```text
<run>/coding-agent-tool-calls.jsonl
```

The raw source is:

```text
$ANTIGRAVITY_CONFIG_DIR/.gemini/antigravity-cli/brain/**/.system_generated/logs/transcript.jsonl
```

Set `session_log_dir` to the `brain` directory and `session_log_glob` to
`**/transcript.jsonl` so Quorum's existing snapshot/diff capture path can find
new transcript files.

Add `normalize_antigravity_logs(raw_content: str)`.

The normalizer should be tolerant because the transcript schema is observed,
not guaranteed:

- Parse JSONL line by line.
- Read tool calls from `PLANNER_RESPONSE.tool_calls[]` when present.
- Ignore malformed lines and non-tool rows.
- Preserve unknown Antigravity tool names instead of dropping or guessing.

Canonical mappings:

| Antigravity tool | Quorum canonical tool | Notes |
| --- | --- | --- |
| `run_command` | `Bash` | Command text under `args.command` when present. |
| `view_file` | `Read` | Preserve path and Antigravity metadata. |
| `write_to_file` | `Write` | Preserve raw args. |
| `replace_file_content` | `Edit` | Preserve raw args. |
| `multi_replace_file_content` | `Edit` | Preserve raw args. |
| `grep_search` | `Grep` | Preserve raw args. |
| `list_dir` | `Glob` | Preserve raw args. |
| `find_by_name` | `Glob` | Preserve raw args. |
| `invoke_subagent` | `Agent` | Preserve subagent type/name/prompt args. |
| `search_web` | `WebSearch` | Preserve raw args. |
| `read_url_content` | `WebFetch` | Preserve raw args. |
| `manage_task` | `manage_task` | Keep raw until real traces show stable action semantics. |

`source` should match the existing convention: `Bash` is `shell`; mapped
native tools are `native`; unknown tools may be `shell` or `native` depending
on whether they map to `NATIVE_TOOLS`. The important property is that unknown
tool calls remain visible in the trace.

## Skill invocation parity

Existing trace tools cannot require a native `Skill` call. Jesse's
Antigravity support loads skills through Antigravity file-reading behavior,
such as `view_file` on a plugin skill file with `IsSkillFile: true`.

Update the shared skill predicate so all skill trace tools agree that these
count as skill invocations:

- Existing native form:
  `{"tool": "Skill", "args": {"skill": "superpowers:<name>"}}`
- Existing shell-read form:
  Bash/Shell/LocalShellCall command reading `skills/<name>/SKILL.md` or
  `skills/superpowers/<name>/SKILL.md`.
- New Antigravity normalized-read form:
  `{"tool": "Read", "args": {...}}` where the read path points at
  `skills/<name>/SKILL.md` or `skills/superpowers/<name>/SKILL.md`.
- New Antigravity skill marker form:
  `{"tool": "Read", "args": {... "IsSkillFile": true ...}}` when the args also
  identify the skill by path.

The predicate must not treat arbitrary file reads as skill invocations. The
path must identify the skill directory being checked.

This is required for parity: `skill-called superpowers:writing-plans` should
mean the same kind of behavioral evidence for Antigravity as it does for
Claude and Codex.

## Runner diagnostics

The existing empty-capture behavior already prevents passing runs with no
trace. Antigravity should add clearer diagnostics for its common failure modes:

- no transcript appeared under the isolated `ANTIGRAVITY_CONFIG_DIR`;
- `agy` wrote a `.antigravitycli` project marker in the workdir, but no matching
  transcript landed in the isolated `.gemini`;
- plugin install succeeded but expected plugin files were missing;
- a transcript appears under the host's real `~/.gemini` during the snapshot
  window, indicating isolation failed.

The spec does not require all diagnostics in the first patch if they would
sprawl. The minimum is a clear runner/setup error for failed install and a
clear post-run indeterminate reason for missing Antigravity transcripts.

## Gauntlet-Agent HOWTO

Add `coding-agents/antigravity-context/HOWTO.md` and `launch-agent`.

The HOWTO should mirror the Claude/Codex shape:

- Tell the Gauntlet-Agent to launch with exactly `"$QUORUM_LAUNCH_AGENT"`.
- Explain that the launcher cd's into the prepared workdir, sets the isolated
  Antigravity config dir, disables auto-update, and starts the interactive
  `agy` CLI.
- Explain where raw transcripts and logs live:
  `$ANTIGRAVITY_CONFIG_DIR/.gemini/antigravity-cli/brain/**/transcript.jsonl`
  and `$ANTIGRAVITY_CONFIG_DIR/agy.log`.
- Tell the Gauntlet-Agent to trust the transcript/log over the screen when
  checking tool calls.
- Provide a `find` command to locate the newest transcript.
- Provide a `watch_logs(...)` pattern analogous to Claude/Codex if Gauntlet
  supports it for these paths.
- Tell the Gauntlet-Agent how to shut down cleanly after a run.

The HOWTO should name the important Antigravity tool mapping differences:
skills load through `view_file`, subagents launch through `invoke_subagent`,
and task artifacts are not evidence of native `Task` behavior until Quorum has
real trace semantics for `manage_task`.

## Docs

Update `README.md`:

- Add `antigravity` to the Coding-Agent table with required env
  `SUPERPOWERS_ROOT`.
- Extend the safety section to mention Antigravity uses
  `--dangerously-skip-permissions`.
- Extend the isolation section to mention `ANTIGRAVITY_CONFIG_DIR` and the
  hidden `agy --gemini_dir` dependency.
- Note that Antigravity live evals rely on user/keyring auth and are not
  public-CI safe.
- Add a troubleshooting note:
  check `agy --version`, keyring/auth state, plugin install output, `agy.log`,
  and whether transcript files landed under the isolated config dir.

## Tests

Static tests should cover the parity layer without launching `agy`:

- `normalize_antigravity_logs()` maps real transcript-shaped JSONL into
  canonical Quorum rows.
- Unknown Antigravity tools are preserved.
- `view_file` reads of `.../skills/<skill>/SKILL.md` count for `skill-called`.
- `view_file` reads with `IsSkillFile: true` count only when the path
  identifies the requested skill.
- Non-skill `view_file` reads do not count as skill invocations.
- `coding-agents/antigravity.yaml` loads successfully once the normalizer is
  registered.
- Antigravity setup installs Superpowers from `SUPERPOWERS_ROOT` into the
  isolated config directory. Mock the `agy` subprocess in unit tests; do not
  run live `agy` in CI.

Trusted-maintainer live smoke, documented but not part of CI:

```bash
SUPERPOWERS_ROOT=/Users/drewritter/prime-rad/superpowers \
uv run quorum run scenarios/codex-native-hooks-bootstrap --coding-agent antigravity
```

If that scenario remains Codex-specific, add or rename a small
cross-agent bootstrap scenario that checks for startup Superpowers availability
and trace evidence. The important acceptance point is not the scenario name;
it is that Antigravity proves Superpowers bootstraps and emits a trace that
Quorum can evaluate.

## Acceptance

- `uv run quorum run <scenario> --coding-agent antigravity` is a valid target.
- Antigravity installs Superpowers from local `SUPERPOWERS_ROOT`, matching
  Claude/Codex local-checkout parity.
- The run uses an isolated per-run Antigravity config tree.
- Antigravity transcripts are captured into
  `coding-agent-tool-calls.jsonl`.
- Antigravity skill reads satisfy the same `skill-called` and ordering checks
  used by Claude and Codex.
- Unknown Antigravity tools stay visible in normalized traces.
- Missing transcripts, failed plugin install, or failed isolation produce clear
  non-passing diagnostics.
- Static tests cover config loading, normalizer behavior, skill predicate
  parity, and setup/install behavior.
- README documents the target, safety model, hidden `--gemini_dir` dependency,
  and live-smoke procedure.
