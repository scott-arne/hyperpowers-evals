# Quorum env-var naming convention + per-agent config-token unification

**Status:** design (2026-06-15)
**Builds on:** `2026-06-15-per-run-home-isolation.md` (throwaway `$HOME` + config collapse)

## Problem

After the throwaway-`$HOME` collapse, each coding agent finds its config via its
`$HOME` default at `<runHome>/<home_config_subdir>`. But three relics survive
from the pre-collapse per-run-config-dir model:

1. **Per-agent substitution tokens.** Every `coding-agents/<agent>.yaml` declares
   an `agent_config_env` — `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `GEMINI_CLI_HOME`,
   `COPILOT_HOME`, `KIMI_CODE_HOME`, `OPENCODE_QUORUM_HOME`,
   `ANTIGRAVITY_CONFIG_DIR`, `PI_CODING_AGENT_DIR`. These are **quorum-internal
   substitution placeholders**, not env vars the agent reads: the runner
   registers `$<TOKEN>`/`$<TOKEN>_SH` → `configDir` and burns them into
   `session_log_dir`, the launch-agent, and the HOWTO. The launchers no longer
   export them at runtime (the agent finds config via `$HOME`). The per-agent
   names are misleading (they look like agent-read env vars) and inconsistent
   (`OPENCODE_QUORUM_HOME` carries `QUORUM` mid-name).

2. **A relic standalone-dir path in the check layer.** Six per-harness bootstrap
   check verbs in `src/check/fs-verbs.ts` still compute config under the
   pre-collapse `<runDir>/coding-agent-config` (antigravity/copilot/opencode/
   gemini/kimi/codex). `QUORUM_RUN_DIR` is always set in post-checks
   (`src/checks/index.ts`), so the legacy branch is live — every
   `*-superpowers-bootstrap` scenario would look in a directory that no longer
   exists. Latent only because recent smokes used the hello-world scenario. No
   tests cover these verbs.

3. **Agent-own runtime vars** that the agent binary genuinely reads —
   `OPENCODE_CONFIG_DIR`, `COPILOT_CACHE_HOME`, and the standard `HOME` / `XDG_*`
   / `TMPDIR` — are correct and must NOT be renamed.

## Convention

**Every quorum-internal env / substitution variable name MUST use the `QUORUM_`
prefix** (a leading `QUORUM_`, not a `_QUORUM` suffix or mid-name `QUORUM`).
(16 already conform: `QUORUM_AGENT_HOME`, `QUORUM_RUN_DIR`,
`QUORUM_REPO_ROOT`, `QUORUM_HOME_ENV`, `QUORUM_RECORD_SINK`,
`QUORUM_LAUNCH_AGENT`, `QUORUM_WORKDIR`, `QUORUM_TRANSCRIPT_PATH`,
`QUORUM_KIMI_PREFLIGHT_*`, the `_SH` variants, …)

Corollaries:

- **Non-conforming internal names are renamed.** `OPENCODE_QUORUM_HOME` →
  removed (it is a relic equal to the throwaway home; see below).
- **Relic per-agent config tokens are removed, not renamed.** They alias the
  throwaway home (or a subdir of it), so they collapse to the existing
  `$QUORUM_AGENT_HOME` substitution. Where the token *is* the home
  (`home_config_subdir: "."` — gemini, opencode, antigravity) the reference
  becomes plain `$QUORUM_AGENT_HOME`; otherwise `$QUORUM_AGENT_HOME/<subdir>`
  (the subdir is `home_config_subdir`, already declared once).
- **Agent-own vars keep their upstream names.** `OPENCODE_CONFIG_DIR`,
  `COPILOT_CACHE_HOME`, `HOME`, `XDG_*`, `TMPDIR` are read by the agent binary —
  they are not quorum-internal and must stay verbatim.

## Design

1. **Drop `agent_config_env`** from `AgentConfigSchema` and all yamls.
2. **`session_log_dir`** templates reference `$QUORUM_AGENT_HOME` (+ literal
   subdir), e.g.
   - claude → `${QUORUM_AGENT_HOME}/.claude/projects`
   - codex → `${QUORUM_AGENT_HOME}/.codex/sessions`
   - gemini → `${QUORUM_AGENT_HOME}/.gemini/tmp`
   - opencode → `${QUORUM_AGENT_HOME}/.quorum/session-exports`
   - copilot → `${QUORUM_AGENT_HOME}/.copilot/session-state`
   - kimi → `${QUORUM_AGENT_HOME}/.kimi-code/sessions`
   - pi → `${QUORUM_AGENT_HOME}/.pi/agent/sessions`
   - antigravity → `${QUORUM_AGENT_HOME}/.gemini/antigravity-cli/brain`
3. **Runner** resolves `session_log_dir` against `homeEnvSubstitutions(runHome)`
   (which provides `$QUORUM_AGENT_HOME`); removes the per-agent `$<TOKEN>` /
   `$<TOKEN>_SH` registration; each agent's `provision()` stops returning
   `{[agent_config_env]: configDir}` (keeps any genuine extras — kimi's
   `KIMI_ENV_FILE`/`KIMI_BINARY`, copilot's session id, …).
4. **Check verbs** receive `QUORUM_AGENT_CONFIG_DIR` (= `configDir`) in the check
   env (`src/checks/index.ts`); the six bootstrap verbs read it and append their
   per-agent subpath; the `<runDir>/coding-agent-config` branches and the
   per-token env fallbacks are deleted. Add TDD tests (currently none).
5. **Launch-agents / HOWTOs** replace `$<TOKEN>` with `$QUORUM_AGENT_HOME`
   (+ subdir). Antigravity additionally drops its runtime `ANTIGRAVITY_CONFIG_DIR`
   export + `--gemini_dir` once a live agy smoke confirms the `$HOME/.gemini`
   default (tracked separately).

## Execution

A subagent inventories **every** env-var name across `coding-agents/`, `src/`,
`scenarios/`, `docs/`, and `test/`, classifying each as: conforming-quorum
(keep), non-conforming-quorum (rename `QUORUM_*`), relic-token (remove → 
`$QUORUM_AGENT_HOME[/subdir]`), agent-own (keep), or standard (keep). The
resulting rename map is applied as one reviewed batch, gated by `bun run check`
+ `bun run quorum check`.
