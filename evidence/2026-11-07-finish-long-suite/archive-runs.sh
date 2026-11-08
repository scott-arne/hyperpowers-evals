#!/usr/bin/env bash
# archive-runs.sh: copy the campaign's runs into runs/, keeping only what the
# analyzer and a reader need: the run record (verdict, grader results,
# trajectory), the main transcripts (home/.claude/projects) and the fixture
# working copy, whose .git is renamed git-dir so it is committed as files and
# not as a gitlink. The CLI install, plugin copy, auth env file, session lock
# files and caches stay behind. A run already archived is skipped.
set -euo pipefail
E=$(cd "$(dirname "$0")" && pwd)
R="$E/../../results"
mapfile -t runs < <(grep -h '^run-id' "$E"/logs/smoke2.out "$E"/logs/control-p*.out "$E"/logs/treatment-p*.out | awk '{print $2}')
[ "${#runs[@]}" -gt 0 ] || { echo "no runs found" >&2; exit 1; }
mkdir -p "$E/runs/workspaces"
for run in "${runs[@]}"; do
  [ -n "$run" ] || continue
  if [ -d "$E/runs/$run" ]; then echo "archived $run"; continue; fi
  cp -R "$R/$run" "$E/runs/$run"
  ws="$E/runs/workspaces/$run"
  mkdir -p "$ws/home/.claude"
  cp -R "$R/workspaces/$run/home/.claude/projects" "$ws/home/.claude/projects"
  cp -R "$R/workspaces/$run/coding-agent-workdir" "$ws/coding-agent-workdir"
  mv "$ws/coding-agent-workdir/.git" "$ws/coding-agent-workdir/git-dir"
  find "$E/runs/$run" "$ws" \( -name __pycache__ -o -name .ruff_cache -o -name .mypy_cache -o -name .claude-env -o -name sessions \) -prune -exec rm -rf {} +
  echo "copied $run"
done
echo "runs: ${#runs[@]}"
