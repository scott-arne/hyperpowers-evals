#!/usr/bin/env bash
# preserve.sh <control|treatment|round2/control|round2/treatment> <n> [run-dir] — copy one run's recorded focus
# argument(s) and verdict out of the harness results dir, and print the word
# count the scenario measures.
set -euo pipefail
arm="$1"; n="$2"
EV=/Users/johnss51/Development/agents/hyperpowers/evals
P=/Users/johnss51/.cache/hyperpowers/sdd/193a951fd4f675975a919be372c5015a95aa0491/plans/2026-09-05-gate-calibration-55863419
RUN="${3:-$(ls -dt "$EV"/results/codex-gate-re-review-focus-is-fixed-claude-auto-* | head -1)}"
OUT="$P/task-3-runs/$arm-$n"
mkdir -p "$OUT"
echo "$RUN" > "$OUT/result-path.txt"
cp "$RUN/verdict.json" "$OUT/verdict.json"
LD="$RUN/home/.claude/plugins/cache/openai-codex/codex/stub/scripts/.launches"
rm -rf "$OUT/launches"
if [ -d "$LD" ]; then cp -R "$LD" "$OUT/launches"; else mkdir -p "$OUT/launches"; fi
echo "run dir: $RUN"
node "$P/task-3-runs/summarize.mjs" "$OUT"
