#!/usr/bin/env bash
# Records the field baseline (spec Design §3): every Zed SDD session event from
# 2026-07-01 up to now, which is before any 6.17.0 install, plus the
# plugin-install worktree's reflog for the after-window. Counts only.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
until="$(date -u +%Y-%m-%dT%H:%M:%S+00:00)"
git -C /Users/johnss51/Development/agents/hyperpowers/.worktrees/plugin-install reflog --date=iso-strict HEAD > "$here/reflog-plugin-install.txt"
python3 "$here/../field.py" --since 2026-07-01T00:00:00+00:00 --until "$until" --out "$here/baseline.json" > "$here/baseline.txt"
echo "baseline window ends $until" >> "$here/baseline.txt"
