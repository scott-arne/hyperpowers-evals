#!/usr/bin/env bash
# campaign.sh ARM [PARALLEL]  : run every scenario x 5 reps for one arm.
set -uo pipefail
ARM=$1; PAR=${2:-5}
ROOT=/Users/johnss51/.cache/hyperpowers/communication-eval/trigger
cd "$ROOT" || exit 1
rm -f "runs/$ARM.done"
for scen in brainstorm plan debug trivial oneliner; do
  for rep in 1 2 3 4 5; do
    echo "$ARM $scen $rep"
  done
done | xargs -P "$PAR" -L 1 bash -c 'bash "$0/run-trigger.sh" "$1" "$2" "$3" > "$0/runs/$1-$2-r$3.log" 2>&1' "$ROOT"
date > "runs/$ARM.done"
echo "campaign $ARM finished"
