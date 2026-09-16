#!/usr/bin/env bash
# Launch one measurement process: <condition> <scenario> <repeat> <proc-id>
# condition: as-is | descriptions-on. Writes logs/<condition>-<scenario>-p<id>.log
set -uo pipefail
cond="$1"; scen="$2"; rep="$3"; pid="$4"
EV=/Users/johnss51/Development/agents/hyperpowers/evals
E="$EV/evidence/2026-09-16-over-trigger-measurement"
cd "$EV" || exit 1
export SUPERPOWERS_ROOT=/Users/johnss51/Development/agents/hyperpowers/.worktrees/external-workflow-adoption
log="$E/logs/$cond-$scen-p$pid.log"
{
  echo "condition=$cond scenario=$scen repeat=$rep proc=$pid"
  echo "\$ git -C \$SUPERPOWERS_ROOT rev-parse HEAD"; git -C "$SUPERPOWERS_ROOT" rev-parse HEAD
  echo "\$ git rev-parse HEAD"; git rev-parse HEAD
  date -u +%Y-%m-%dT%H:%M:%SZ
  if [ "$cond" = "descriptions-on" ]; then
    echo "\$ SLASH_COMMAND_TOOL_CHAR_BUDGET=20000 bun run quorum run scenarios/$scen --coding-agent claude-auto --repeat $rep"
    SLASH_COMMAND_TOOL_CHAR_BUDGET=20000 bun run quorum run "scenarios/$scen" --coding-agent claude-auto --repeat "$rep"
  else
    echo "\$ bun run quorum run scenarios/$scen --coding-agent claude-auto --repeat $rep"
    bun run quorum run "scenarios/$scen" --coding-agent claude-auto --repeat "$rep"
  fi
  echo "EXIT=$?"; date -u +%Y-%m-%dT%H:%M:%SZ
} > "$log" 2>&1
echo "DONE $cond $scen p$pid" >> "$log"
