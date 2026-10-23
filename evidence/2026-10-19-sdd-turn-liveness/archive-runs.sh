#!/usr/bin/env bash
# archive-runs.sh <arm> <task-dir>
# Copies every run the arm's launch logs name from results/ into
# <task-dir>/<arm>/<run-id>/, with the run's workspace beside it in
# <task-dir>/<arm>/workspaces/<run-id>/, and applies ../README.md's pre-commit
# steps to the copies: strip-runs, the fixture's .git renamed to git-dir, and
# the host state strip-runs leaves behind removed (the rest of
# home/.claude/plugins, home/.codex, browser profiles and Python or node
# caches). home/.cache/hyperpowers stays: a surviving SDD ledger is read by
# analyze.py beside the transcript's own ledger writes. results/ stays as
# quorum wrote it (copy, never move). A run already archived is skipped; a
# named run without a verdict stops the script. Each copy is built under
# <run-id>.partial and renamed only once it is complete. Staging (git add -f)
# and the post-check are done at commit time.
# Adapted from ../2026-10-03-release-6150-paired-control/archive-runs.sh.
set -euo pipefail
arm="$1"; task_dir="$2"
case "$arm" in control|treatment) ;; *) echo "arm must be control or treatment" >&2; exit 2 ;; esac
E="$(cd "$(dirname "$0")" && pwd)"
EV="${EVALS_DIR:-$(cd "$E/../.." && pwd)}"
logs="${LOGS:-$E/logs}"
out="$task_dir/$arm"

ids=$(cat "$logs/$arm"-sdd-turn-liveness-*.log | sed -n 's/^run-id: \([^ ]*\)$/\1/p')

clean() {
  local d=$1
  rm -rf "$d/home/.claude/plugins" "$d/home/.codex"
  find "$d/home/.tmp" -maxdepth 1 -name 'cdp-*' -exec rm -rf {} + 2>/dev/null || true
  find "$d" -type d \( -name node_modules -o -name .ruff_cache -o -name .mypy_cache -o -name __pycache__ \) -prune -exec rm -rf {} +
}

archive() {
  local id=$1
  local src="$EV/results/$id" wsrc="$EV/results/workspaces/$id"
  local dst="$out/$id" wdst="$out/workspaces/$id"
  if [ -e "$dst" ]; then echo "skip $arm $id (archived)"; return; fi
  [ -f "$src/verdict.json" ] || { echo "no verdict: $src" >&2; exit 1; }
  [ -d "$wsrc" ] || { echo "no workspace: $wsrc" >&2; exit 1; }
  mkdir -p "$out/workspaces"
  rm -rf "$dst.partial" "$wdst.partial"
  cp -Rp "$src" "$dst.partial"
  cp -Rp "$wsrc" "$wdst.partial"
  # strip-runs finds a run's home/ at <root>/workspaces/<name>/home, so it can
  # only strip once both copies exist; the .partial names are the run names here.
  # strip-runs skips a record touched within the last minute and still exits 0,
  # and cp -p keeps the run's timestamps; git keeps none, so backdating is free.
  touch -t 200001010000 "$dst.partial" "$dst.partial/verdict.json"
  "$EV/scripts/strip-runs" --results-root "$out" --run "$id.partial" --min-age-minutes 0
  for left in .claude/.claude-env .claude/sessions; do
    [ ! -e "$wdst.partial/home/$left" ] || { echo "strip-runs left $wdst.partial/home/$left" >&2; exit 1; }
  done
  clean "$dst.partial"
  if [ -d "$wdst.partial/coding-agent-workdir/.git" ]; then
    mv "$wdst.partial/coding-agent-workdir/.git" "$wdst.partial/coding-agent-workdir/git-dir"
  fi
  clean "$wdst.partial"
  mv "$wdst.partial" "$wdst"
  mv "$dst.partial" "$dst"
  echo "archived $arm $id"
}

for id in $ids; do archive "$id"; done
