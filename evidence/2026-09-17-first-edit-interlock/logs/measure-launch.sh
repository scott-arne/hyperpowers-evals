#!/usr/bin/env bash
# measure-launch.sh <arm> <scenario> <repeat> <proc> <budget>
# Runs one quorum process for the first-edit interlock measurement after
# checking the manifest's pins: the arm's root at its commit with a clean
# tree, the evals clone with harness paths identical to the pinned harness
# commit (evidence commits may follow the pin; harness code may not) and no
# changes in the harness paths, the model ANTHROPIC_MODEL names, and the
# Claude Code version the launching host runs. budget must be `default` (the
# production listing budget; SLASH_COMMAND_TOOL_CHAR_BUDGET is unset for the
# session). Writes logs/<arm>-<scenario>-<proc>.log (proc is p<n> for a
# manifest row or r<n> for a rerun) with the pins, the budget, the launch
# nonce (LAUNCH_NONCE from launch-all.sh, `manual` for a row launched by
# hand), the time, the exact command, quorum's output, and a `harness void:`
# line for every run directory quorum named that has no
# coding-agent-token-usage.json (a void attempt the analysis refuses to count).
# The last line is DONE only when quorum exited 0, 1, or 2 (a pass, a fail, or
# an indeterminate are measurements); anything else is FAILED <code>. Refuses
# to launch when the proxy variables the sessions need are not set (validated,
# never re-exported), when ANTHROPIC_MODEL differs from the manifest's model
# row, when `claude --version` differs from the manifest's claude_code row, or
# when a git status check fails. A row whose log already exists is refused
# unless RELAUNCH=1, which first sets the previous attempt aside as
# logs/failed/<arm>-<scenario>-<proc>.<attempt>.log, the void ledger the
# analysis reads. MEASURE_E overrides the evidence directory for the offline
# proof in the plan only.
set -uo pipefail
arm="$1"; scen="$2"; rep="$3"; proc="$4"; budget="$5"
EV=/Users/johnss51/Development/agents/hyperpowers/evals
E="${MEASURE_E:-$EV/evidence/2026-09-17-first-edit-interlock}"
HARNESS_PATHS="src scenarios coding-agents package.json bun.lock"
case "$arm" in
  control) root=/Users/johnss51/Development/agents/hyperpowers/.worktrees/external-workflow-adoption ;;
  wording) root=/Users/johnss51/Development/agents/hyperpowers/.worktrees/first-edit-interlock-wording ;;
  full) root=/Users/johnss51/Development/agents/hyperpowers/.worktrees/first-edit-interlock ;;
  *) echo "arm must be control, wording, or full" >&2; exit 2 ;;
esac
case "$proc" in p[0-9]|p[0-9][0-9]|p[0-9][0-9][0-9]|r[0-9]|r[0-9][0-9]|r[0-9][0-9][0-9]) ;; *) echo "proc must be p<n> or r<n>" >&2; exit 2 ;; esac
case "$budget" in default) ;; *) echo "budget must be default" >&2; exit 2 ;; esac
log="$E/logs/$arm-$scen-$proc.log"
if [ -e "$log" ]; then
  [ "${RELAUNCH:-}" = "1" ] || { echo "$log exists; a row is relaunched only with RELAUNCH=1, which sets the previous attempt aside in logs/failed/" >&2; exit 1; }
  mkdir -p "$E/logs/failed" || exit 1
  n=1; while [ -e "$E/logs/failed/$arm-$scen-$proc.$n.log" ]; do n=$((n + 1)); done
  mv "$log" "$E/logs/failed/$arm-$scen-$proc.$n.log" || exit 1
  echo "previous attempt set aside as logs/failed/$arm-$scen-$proc.$n.log"
fi
for v in HTTP_PROXY HTTPS_PROXY NO_PROXY; do [ -n "${!v:-}" ] || { echo "$v is not set in the launch environment; the live session needs the proxy configuration" >&2; exit 1; }; done
pin() { awk -F '\t' -v key="$1" 'NF == 2 && $1 == key { print $2 }' "$E/manifest.tsv"; }
root_pin=$(pin "$arm"); harness_pin=$(pin harness); model_pin=$(pin model); claude_pin=$(pin claude_code)
case "$root_pin$harness_pin$claude_pin" in *'<'*|'') echo "manifest.tsv is not filled in" >&2; exit 1 ;; esac
[ -n "$model_pin" ] || { echo "manifest.tsv has no model row" >&2; exit 1; }
[ "${ANTHROPIC_MODEL:-}" = "$model_pin" ] || { echo "ANTHROPIC_MODEL is '${ANTHROPIC_MODEL:-}', the manifest pins '$model_pin'; claude-auto would launch the wrong model" >&2; exit 1; }
claude_version=$(claude --version 2>/dev/null | awk '{print $1}')
[ "$claude_version" = "$claude_pin" ] || { echo "claude --version says '$claude_version', the manifest pins '$claude_pin'" >&2; exit 1; }
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
{
  echo "arm=$arm scenario=$scen repeat=$rep proc=$proc budget=$budget"
  echo "nonce=${LAUNCH_NONCE:-manual}"
  echo "root=$root_pin root_clean=0"
  echo "harness_pin=$harness_pin evals_head=$(git rev-parse HEAD) harness_paths_identical=yes"
  echo "model_pin=$model_pin anthropic_model=$ANTHROPIC_MODEL"
  echo "claude_code=$claude_version"
  date -u +%Y-%m-%dT%H:%M:%SZ
  echo "\$ env -u SLASH_COMMAND_TOOL_CHAR_BUDGET bun run quorum run scenarios/$scen --coding-agent claude-auto --repeat $rep"
  env -u SLASH_COMMAND_TOOL_CHAR_BUDGET bun run quorum run "scenarios/$scen" --coding-agent claude-auto --repeat "$rep"
  code=$?
  grep -o 'run-dir  *[^[:space:]]*' "$log" | awk '{print $2}' | while read -r d; do
    [ -f "$d/coding-agent-token-usage.json" ] || echo "harness void: no coding-agent-token-usage.json in $d"
  done
  echo "EXIT=$code"; date -u +%Y-%m-%dT%H:%M:%SZ
  case "$code" in 0|1|2) echo "DONE $arm $scen $proc" ;; *) echo "FAILED $code $arm $scen $proc" ;; esac
} > "$log" 2>&1
