#!/usr/bin/env bash
# Records the field baseline (spec Design §3): every Zed SDD session event from
# 2026-07-01 to a fixed cutoff, which is before any 6.17.0 install, plus the
# plugin-install worktree's reflog for the after-window. Counts only.
# field.py classifies an event from later records (a task's completion, the
# transcript's end, the session's SDD invocation), so a cutoff at the moment of
# capture drifts while sessions keep writing. The cutoff sits more than a day
# before capture: the work open at it has finished and sessions started after
# it are out, and two runs must agree before the result is kept.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
until="2026-10-20T00:00:00+00:00"
recheck="${TMPDIR:-/tmp}/field-baseline-recheck.json"
git -C /Users/johnss51/Development/agents/hyperpowers/.worktrees/plugin-install reflog --date=iso-strict HEAD > "$here/reflog-plugin-install.txt"
python3 "$here/../field.py" --since 2026-07-01T00:00:00+00:00 --until "$until" --out "$here/baseline.json" > "$here/baseline.txt"
python3 "$here/../field.py" --since 2026-07-01T00:00:00+00:00 --until "$until" --out "$recheck" > /dev/null
cmp -s "$here/baseline.json" "$recheck" || { echo "two runs of the fixed window disagree" >&2; exit 1; }
echo "baseline window ends $until" >> "$here/baseline.txt"
