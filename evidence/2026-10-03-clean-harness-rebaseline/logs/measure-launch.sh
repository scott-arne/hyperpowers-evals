#!/usr/bin/env bash
# measure-launch.sh <arm> <scenario> <repeat> <proc> <budget>
# Runs one quorum process for the clean-harness re-baseline after checking the
# manifest's pins: the root at its commit with a clean tree, the evals clone
# with harness paths identical to the pinned harness commit (evidence commits
# may follow the pin; harness code may not) and no changes in the harness
# paths, the Claude Code binary at the campaign's version, and the model
# claude-auto will resolve. budget is always `default`
# (SLASH_COMMAND_TOOL_CHAR_BUDGET and INTERLOCK_PROBE_TRACE both explicitly
# unset, the production listing budget with no interlock trace). Writes
# logs/<arm>-<scenario>-<proc>.log (proc is p<n> for a manifest row or r<n> for
# a replacement) with the pins, the budget, the time, the exact command, and
# quorum's output. The last line is DONE only when quorum exited 0, 1, or 2 (a
# pass, a fail, or an indeterminate are measurements); anything else is
# FAILED <code>. Refuses to launch when the proxy variables the sessions need
# are not set (validated, never re-exported), when a git status check fails,
# when `claude --version` is not the campaign's version, or when claude-auto
# would resolve a model other than the manifest's model row.
# Adapted from evidence/2026-09-30-main-boundary-gating/logs/measure-launch.sh:
# the evidence directory, the root, the version check, and the model check.
# The launcher at the harness pin drops every inherited ANTHROPIC* variable
# before it starts the agent, but claude-auto resolves the model in quorum from
# the host's ANTHROPIC_MODEL first and the provider's Opus id second
# (src/agents/index.ts resolveClaudeAutoModel), so the check reads both.
set -uo pipefail
arm="$1"; scen="$2"; rep="$3"; proc="$4"; budget="$5"
EV=/Users/johnss51/Development/agents/hyperpowers/evals
E="$EV/evidence/2026-10-03-clean-harness-rebaseline"
MANIFEST="${MANIFEST:-$E/manifest.tsv}"
LOGS="${LOGS:-$E/logs}"
HARNESS_PATHS="src scenarios coding-agents package.json bun.lock"
EXPECTED_CC="2.1.288 (Claude Code)"
case "$arm" in
  control) root=/Users/johnss51/.cache/hyperpowers/clean-rebaseline/hp-6150 ;;
  *) echo "arm must be control" >&2; exit 2 ;;
esac
case "$proc" in p[0-9]|p[0-9][0-9]|r[0-9]|r[0-9][0-9]) ;; *) echo "proc must be p<n> or r<n>" >&2; exit 2 ;; esac
case "$budget" in default) ;; *) echo "budget must be default" >&2; exit 2 ;; esac
for v in HTTP_PROXY HTTPS_PROXY NO_PROXY; do [ -n "${!v:-}" ] || { echo "$v is not set in the launch environment; the live session needs the proxy configuration" >&2; exit 1; }; done
pin() { awk -F '\t' -v key="$1" 'NF == 2 && $1 == key { print $2 }' "$MANIFEST"; }
root_pin=$(pin "$arm"); harness_pin=$(pin harness); model_pin=$(pin model)
case "$root_pin$harness_pin" in *'<'*|'') echo "manifest.tsv is not filled in" >&2; exit 1 ;; esac
[ -n "$model_pin" ] || { echo "manifest.tsv has no model row" >&2; exit 1; }
if [ -n "${ANTHROPIC_MODEL:-}" ]; then
  resolved="$ANTHROPIC_MODEL"; resolved_from="host ANTHROPIC_MODEL"
elif [ "${CLAUDE_CODE_USE_VERTEX:-}" = 1 ] && [ -z "${CLAUDE_CODE_USE_BEDROCK:-}" ]; then
  resolved="claude-opus-5-5"; resolved_from="claude-auto Vertex default"
else
  echo "cannot tell which model claude-auto would resolve (ANTHROPIC_MODEL unset, provider not Vertex alone)" >&2; exit 1
fi
[ "$resolved" = "$model_pin" ] || { echo "claude-auto would launch '$resolved' ($resolved_from), the manifest pins '$model_pin'" >&2; exit 1; }
cc_version=$(claude --version 2>/dev/null) || { echo "claude --version failed" >&2; exit 1; }
[ "$cc_version" = "$EXPECTED_CC" ] || { echo "claude --version prints '$cc_version', the campaign pins '$EXPECTED_CC'" >&2; exit 1; }
[ "$(git -C "$root" rev-parse HEAD)" = "$root_pin" ] || { echo "$arm root is not at $root_pin" >&2; exit 1; }
root_status=$(git -C "$root" status --short) || { echo "git status failed in $root" >&2; exit 1; }
[ -z "$root_status" ] || { echo "$arm root has uncommitted changes" >&2; exit 1; }
cd "$EV" || exit 1
git cat-file -e "$harness_pin^{commit}" 2>/dev/null || { echo "harness pin $harness_pin does not resolve" >&2; exit 1; }
# shellcheck disable=SC2086
git diff --quiet "$harness_pin" HEAD -- $HARNESS_PATHS || { echo "harness paths differ from $harness_pin" >&2; exit 1; }
# shellcheck disable=SC2086
harness_status=$(git status --short -- $HARNESS_PATHS) || { echo "git status failed in $EV" >&2; exit 1; }
[ -z "$harness_status" ] || { echo "harness paths have uncommitted changes" >&2; exit 1; }
export SUPERPOWERS_ROOT="$root"
mkdir -p "$LOGS" || exit 1
log="$LOGS/$arm-$scen-$proc.log"
{
  echo "arm=$arm scenario=$scen repeat=$rep proc=$proc budget=$budget"
  echo "root=$root_pin root_clean=0"
  echo "harness_pin=$harness_pin evals_head=$(git rev-parse HEAD) harness_paths_identical=yes"
  echo "model_pin=$model_pin resolved=$resolved ($resolved_from)"
  echo "claude_version=$cc_version"
  date -u +%Y-%m-%dT%H:%M:%SZ
  echo "\$ env -u INTERLOCK_PROBE_TRACE -u SLASH_COMMAND_TOOL_CHAR_BUDGET bun run quorum run scenarios/$scen --coding-agent claude-auto --repeat $rep"
  env -u INTERLOCK_PROBE_TRACE -u SLASH_COMMAND_TOOL_CHAR_BUDGET bun run quorum run "scenarios/$scen" --coding-agent claude-auto --repeat "$rep"
  code=$?
  echo "EXIT=$code"; date -u +%Y-%m-%dT%H:%M:%SZ
  case "$code" in 0|1|2) echo "DONE $arm $scen $proc" ;; *) echo "FAILED $code $arm $scen $proc" ;; esac
} > "$log" 2>&1
