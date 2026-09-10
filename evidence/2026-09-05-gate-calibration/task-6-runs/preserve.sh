#!/usr/bin/env bash
# preserve.sh <control|treatment> <agent> [run-dir] — copy one run's verdict,
# the project runner's invocation log, and the Gauntlet-Agent's graded result
# out of the harness results dir, then print the verdict line.
set -euo pipefail
arm="$1"; agent="$2"
EV=/Users/johnss51/Development/agents/hyperpowers/evals
P=/Users/johnss51/.cache/hyperpowers/sdd/193a951fd4f675975a919be372c5015a95aa0491/plans/2026-09-05-gate-calibration-55863419
RUN="${3:-$(ls -dt "$EV"/results/tdd-runs-the-project-suite-"$agent"-* | head -1)}"
OUT="$P/task-6-runs/${ROUND:+$ROUND/}$arm/$agent"
mkdir -p "$OUT"
echo "$RUN" > "$OUT/result-path.txt"
cp "$RUN/verdict.json" "$OUT/verdict.json"
if [ -f "$RUN/coding-agent-workdir/.test-history.log" ]; then
  cp "$RUN/coding-agent-workdir/.test-history.log" "$OUT/test-history.log"
fi
find "$RUN/gauntlet-agent" -name 'result.md' -exec cp {} "$OUT/gauntlet-result.md" \; 2>/dev/null || true
if [ -f "$RUN/gauntlet-agent/gauntlet-stderr.log" ]; then
  cp "$RUN/gauntlet-agent/gauntlet-stderr.log" "$OUT/gauntlet-stderr.log"
fi
echo "run dir: $RUN"
node -e '
const v = require(process.argv[1] + "/verdict.json");
console.log("final=" + v.final + " reason=" + (v.final_reason ?? "-") + " gauntlet=" + (v.gauntlet && v.gauntlet.status));
for (const c of v.checks ?? []) {
  console.log("  " + c.phase + " " + c.check + " passed=" + c.passed + (c.detail ? " :: " + String(c.detail).slice(0, 200) : ""));
}
' "$OUT"
