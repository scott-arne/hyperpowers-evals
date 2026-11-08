#!/usr/bin/env bash
# status.sh: measures for every finished campaign run, then the per-arm tally.
set -euo pipefail
E=$(cd "$(dirname "$0")" && pwd)
R="${1:-$E/../../results}"
mapfile -t runs < <(grep -h '^run-id' "$E"/logs/control-p*.out "$E"/logs/treatment-p*.out | awk '{print $2}')
[ "${#runs[@]}" -gt 0 ] || { echo "no finished runs"; exit 0; }
python3 "$E/analyze.py" "$R" "${runs[@]}" > "$E/measures.jsonl"
python3 - "$E/measures.jsonl" <<'PY'
import json, sys
for line in open(sys.argv[1]):
    r = json.loads(line)
    print(r["run"][-4:], r.get("arm"), r["final"], "L", r.get("L"), "S", r.get("S"), "M", r.get("M"),
          "live", len(r.get("live_turn_ends") or []), "wait_exit", r.get("wait_exit_calls"))
PY
python3 "$E/analyze.py" --tally "$E/measures.jsonl"
