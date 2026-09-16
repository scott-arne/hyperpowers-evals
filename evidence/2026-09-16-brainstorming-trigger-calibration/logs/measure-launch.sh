#!/usr/bin/env bash
# measure-launch.sh <arm> <scenario> <repeat> <proc>
# Runs one quorum process for the calibration after checking the manifest's
# pins: the arm's root at its commit with a clean tree, and the evals clone with
# harness paths identical to the pinned harness commit (evidence commits may
# follow the pin; harness code may not) and no changes outside evidence/.
# Writes logs/<arm>-<scenario>-<proc>.log (proc is p<n> for a manifest row or
# r<n> for a rerun) with the pins, the time, the exact command, and quorum's
# output. The last line is DONE only when quorum exited 0, 1, or 2 (a pass, a
# fail, or an indeterminate are measurements); anything else is FAILED <code>.
set -uo pipefail
arm="$1"; scen="$2"; rep="$3"; proc="$4"
EV=/Users/johnss51/Development/agents/hyperpowers/evals
E="$EV/evidence/2026-09-16-brainstorming-trigger-calibration"
HARNESS_PATHS="src scenarios coding-agents package.json bun.lock"
case "$arm" in
  control) root=/Users/johnss51/Development/agents/hyperpowers/.worktrees/external-workflow-adoption ;;
  treatment) root=/Users/johnss51/Development/agents/hyperpowers/.worktrees/brainstorming-trigger ;;
  *) echo "arm must be control or treatment" >&2; exit 2 ;;
esac
case "$proc" in p[0-9]|p[0-9][0-9]|r[0-9]|r[0-9][0-9]) ;; *) echo "proc must be p<n> or r<n>" >&2; exit 2 ;; esac
pin() { awk -F '\t' -v key="$1" 'NF == 2 && $1 == key { print $2 }' "$E/manifest.tsv"; }
root_pin=$(pin "$arm"); harness_pin=$(pin harness)
case "$root_pin$harness_pin" in *'<'*|'') echo "manifest.tsv is not filled in" >&2; exit 1 ;; esac
[ "$(git -C "$root" rev-parse HEAD)" = "$root_pin" ] || { echo "$arm root is not at $root_pin" >&2; exit 1; }
[ -z "$(git -C "$root" status --short)" ] || { echo "$arm root has uncommitted changes" >&2; exit 1; }
cd "$EV" || exit 1
git cat-file -e "$harness_pin^{commit}" 2>/dev/null || { echo "harness pin $harness_pin does not resolve" >&2; exit 1; }
# shellcheck disable=SC2086
git diff --quiet "$harness_pin" HEAD -- $HARNESS_PATHS || { echo "harness paths differ from $harness_pin" >&2; exit 1; }
# shellcheck disable=SC2086
[ -z "$(git status --short -- $HARNESS_PATHS)" ] || { echo "harness paths have uncommitted changes" >&2; exit 1; }
export SUPERPOWERS_ROOT="$root"
log="$E/logs/$arm-$scen-$proc.log"
{
  echo "arm=$arm scenario=$scen repeat=$rep proc=$proc"
  echo "root=$root_pin root_clean=0"
  echo "harness_pin=$harness_pin evals_head=$(git rev-parse HEAD) harness_paths_identical=yes"
  date -u +%Y-%m-%dT%H:%M:%SZ
  echo "\$ SLASH_COMMAND_TOOL_CHAR_BUDGET=20000 bun run quorum run scenarios/$scen --coding-agent claude-auto --repeat $rep"
  SLASH_COMMAND_TOOL_CHAR_BUDGET=20000 bun run quorum run "scenarios/$scen" --coding-agent claude-auto --repeat "$rep"
  code=$?
  echo "EXIT=$code"; date -u +%Y-%m-%dT%H:%M:%SZ
  case "$code" in 0|1|2) echo "DONE $arm $scen $proc" ;; *) echo "FAILED $code $arm $scen $proc" ;; esac
} > "$log" 2>&1
