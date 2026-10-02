#!/usr/bin/env bash
# measure-launch.sh <arm> <scenario> <repeat> <proc> <budget>
# Runs one quorum process for the companion-over-trigger campaign after
# checking the manifest's pins: the arm's root at its commit with a clean tree,
# the evals clone with harness paths identical to the pinned harness commit
# (evidence commits may follow the pin; harness code may not) and no changes in
# the harness paths, and the host Claude Code at CC_PIN. budget is always
# `default` (SLASH_COMMAND_TOOL_CHAR_BUDGET and INTERLOCK_PROBE_TRACE both
# explicitly unset, the production listing budget with no interlock trace).
# Writes logs/<arm>-<scenario>-<proc>.log (proc is p<n> for a manifest row or
# r<n> for a replacement) with the pins, the budget, the Claude Code version
# before and after the run, the time, the exact command, and quorum's output.
# The last line is DONE only when quorum exited 0, 1, or 2 (a pass, a fail, or
# an indeterminate are measurements); anything else is FAILED <code>. Refuses
# to launch when the proxy variables the sessions need are not set (validated,
# never re-exported), when ANTHROPIC_MODEL differs from the manifest's model
# row (claude-auto launches whatever that variable names), when the host
# `claude` is not CC_PIN, when GAUNTLET_AGENT_MODEL is not GRADER_PIN, or when
# a git status check fails.
# Adapted from ../../2026-10-02-companion-placement-trigger/logs/measure-launch.sh;
# the evidence directory differs, and the control arm is back: it runs the
# uncounted pilot from manifest-pilot.tsv, the treatment runs the counted batch.
set -uo pipefail
arm="$1"; scen="$2"; rep="$3"; proc="$4"; budget="$5"
EV=/Users/johnss51/Development/agents/hyperpowers/evals
E="$EV/evidence/2026-10-02-companion-over-trigger"
MANIFEST="${MANIFEST:-$E/manifest.tsv}"
LOGS="${LOGS:-$E/logs}"
HARNESS_PATHS="src scenarios coding-agents package.json bun.lock"
CC_PIN=2.1.287
GRADER_PIN=claude-opus-5-5
case "$arm" in
  control) root=/Users/johnss51/Development/agents/hyperpowers/.worktrees/companion-baseline ;;
  treatment) root=/Users/johnss51/Development/agents/hyperpowers/.worktrees/companion-placement-trigger ;;
  *) echo "arm must be control or treatment" >&2; exit 2 ;;
esac
case "$proc" in p[0-9]|p[0-9][0-9]|r[0-9]|r[0-9][0-9]) ;; *) echo "proc must be p<n> or r<n>" >&2; exit 2 ;; esac
case "$budget" in default) ;; *) echo "budget must be default" >&2; exit 2 ;; esac
for v in HTTP_PROXY HTTPS_PROXY NO_PROXY; do [ -n "${!v:-}" ] || { echo "$v is not set in the launch environment; the live session needs the proxy configuration" >&2; exit 1; }; done
pin() { awk -F '\t' -v key="$1" 'NF == 2 && $1 == key { print $2 }' "$MANIFEST"; }
root_pin=$(pin "$arm"); harness_pin=$(pin harness); model_pin=$(pin model)
case "$root_pin$harness_pin" in *'<'*|'') echo "$(basename "$MANIFEST") is not filled in for $arm" >&2; exit 1 ;; esac
[ -n "$root_pin" ] || { echo "$(basename "$MANIFEST") has no $arm row" >&2; exit 1; }
[ -n "$model_pin" ] || { echo "$(basename "$MANIFEST") has no model row" >&2; exit 1; }
[ "${ANTHROPIC_MODEL:-}" = "$model_pin" ] || { echo "ANTHROPIC_MODEL is '${ANTHROPIC_MODEL:-}', the manifest pins '$model_pin'; claude-auto would launch the wrong model" >&2; exit 1; }
[ "${GAUNTLET_AGENT_MODEL:-}" = "$GRADER_PIN" ] || { echo "GAUNTLET_AGENT_MODEL is '${GAUNTLET_AGENT_MODEL:-}', the campaign pins the grader to $GRADER_PIN" >&2; exit 1; }
cc_before=$(claude --version 2>/dev/null)
case "$cc_before" in "$CC_PIN "*) ;; *) echo "claude --version is '$cc_before', the campaign pins $CC_PIN" >&2; exit 1 ;; esac
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
  echo "manifest=$(basename "$MANIFEST")"
  echo "root=$root_pin root_clean=0"
  echo "harness_pin=$harness_pin evals_head=$(git rev-parse HEAD) harness_paths_identical=yes"
  echo "model_pin=$model_pin anthropic_model=$ANTHROPIC_MODEL"
  echo "anthropic_default_opus_model=${ANTHROPIC_DEFAULT_OPUS_MODEL:-unset}"
  echo "grader_pin=$GRADER_PIN gauntlet_agent_model=$GAUNTLET_AGENT_MODEL"
  echo "cc_pin=$CC_PIN claude_version_before=$cc_before"
  date -u +%Y-%m-%dT%H:%M:%SZ
  echo "\$ env -u INTERLOCK_PROBE_TRACE -u SLASH_COMMAND_TOOL_CHAR_BUDGET bun run quorum run scenarios/$scen --coding-agent claude-auto --repeat $rep"
  env -u INTERLOCK_PROBE_TRACE -u SLASH_COMMAND_TOOL_CHAR_BUDGET bun run quorum run "scenarios/$scen" --coding-agent claude-auto --repeat "$rep"
  code=$?
  echo "EXIT=$code"; date -u +%Y-%m-%dT%H:%M:%SZ
  echo "claude_version_after=$(claude --version 2>/dev/null)"
  case "$code" in 0|1|2) echo "DONE $arm $scen $proc" ;; *) echo "FAILED $code $arm $scen $proc" ;; esac
} > "$log" 2>&1
